#!/usr/bin/env python3
"""
Training script that reads data from MongoDB instead of parquet files
"""

import os
import sys
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional

# Add backend to path
sys.path.append(os.path.dirname(__file__))

from database import get_client, get_db
from data_loader_mongodb import get_data_loader
from utils import log_info, log_error

# CatBoost import'u - varsa kullan
try:
    from catboost import CatBoostRegressor
    CATBOOST_AVAILABLE = True
except ImportError:
    CATBOOST_AVAILABLE = False
    log_error("CatBoost kütüphanesi bulunamadı - pip install catboost")


class MongoDBTrainer:
    """MongoDB-based trainer"""
    
    def __init__(self, db_name="aquatrack"):
        self.data_loader = get_data_loader()
        self.models = {}
        self.feature_columns = None
        
    def get_training_data(self, split_type: str = "train", horizon: int = 1) -> Optional[pd.DataFrame]:
        """Get training data from MongoDB"""
        log_info(f"Loading {split_type} data for horizon {horizon} from MongoDB")
        
        df = self.data_loader.get_training_data(split_type=split_type, horizon=horizon)
        
        if df is None or df.empty:
            log_error(f"No {split_type} data found for horizon {horizon}")
            return None
        
        # Convert features dict to columns
        if 'features' in df.columns:
            # Expand features dict into separate columns
            features_df = pd.json_normalize(df['features'])
            df = pd.concat([df.drop('features', axis=1), features_df], axis=1)
        
        log_info(f"Loaded {len(df)} {split_type} records with {df.shape[1]} columns")
        return df
    
    def prepare_features_and_targets(self, df: pd.DataFrame) -> tuple:
        """Prepare features and targets for training"""
        if df is None or df.empty:
            return None, None
        
        # Define feature columns (exclude metadata and targets)
        exclude_cols = [
            '_id', 'lake_id', 'date', 'horizon', 'split_type', 'target_water_area_m2',
            'target_date', 'baseline_locf', 'baseline_seasonal', 'lake_id_enc', 'created_at'
        ]
        
        feature_cols = [col for col in df.columns if col not in exclude_cols]
        self.feature_columns = feature_cols
        
        # Prepare features and targets
        X = df[feature_cols].fillna(0)  # Fill NaN with 0
        y = df['target_water_area_m2'].fillna(0)  # Fill NaN with 0
        
        # Remove rows where target is 0 or NaN
        valid_mask = (y > 0) & ~y.isna()
        X = X[valid_mask]
        y = y[valid_mask]
        
        log_info(f"Prepared {len(X)} samples with {len(feature_cols)} features")
        log_info(f"Feature columns: {feature_cols[:10]}...")  # Show first 10 features
        
        return X, y
    
    def train_model(self, horizon: int = 1, model_name: str = None) -> bool:
        """Train a model for a specific horizon"""
        if not CATBOOST_AVAILABLE:
            log_error("CatBoost not available")
            return False
        
        if model_name is None:
            model_name = f"catboost_H{horizon}_mongodb"
        
        log_info(f"Training model {model_name} for horizon {horizon}")
        
        # Get training data
        train_df = self.get_training_data("train", horizon)
        if train_df is None:
            return False
        
        # Prepare features and targets
        X_train, y_train = self.prepare_features_and_targets(train_df)
        if X_train is None or y_train is None:
            return False
        
        # Get validation data if available
        val_df = self.get_training_data("val", horizon)
        X_val, y_val = None, None
        if val_df is not None:
            X_val, y_val = self.prepare_features_and_targets(val_df)
        
        # Train CatBoost model
        model = CatBoostRegressor(
            iterations=1000,
            depth=6,
            learning_rate=0.1,
            loss_function='RMSE',
            eval_metric='RMSE',
            random_seed=42,
            verbose=100
        )
        
        # Fit model
        if X_val is not None and y_val is not None:
            model.fit(
                X_train, y_train,
                eval_set=(X_val, y_val),
                early_stopping_rounds=50,
                verbose=100
            )
        else:
            model.fit(X_train, y_train, verbose=100)
        
        # Store model
        self.models[model_name] = model
        
        # Evaluate model
        train_pred = model.predict(X_train)
        train_rmse = np.sqrt(np.mean((y_train - train_pred) ** 2))
        train_mae = np.mean(np.abs(y_train - train_pred))
        
        log_info(f"Model {model_name} trained successfully")
        log_info(f"Train RMSE: {train_rmse:,.0f}")
        log_info(f"Train MAE: {train_mae:,.0f}")
        
        if X_val is not None and y_val is not None:
            val_pred = model.predict(X_val)
            val_rmse = np.sqrt(np.mean((y_val - val_pred) ** 2))
            val_mae = np.mean(np.abs(y_val - val_pred))
            log_info(f"Val RMSE: {val_rmse:,.0f}")
            log_info(f"Val MAE: {val_mae:,.0f}")
        
        return True
    
    def evaluate_model(self, horizon: int = 1, model_name: str = None) -> Dict[str, float]:
        """Evaluate model on test data"""
        if model_name is None:
            model_name = f"catboost_H{horizon}_mongodb"
        
        if model_name not in self.models:
            log_error(f"Model {model_name} not found")
            return {}
        
        # Get test data
        test_df = self.get_training_data("test", horizon)
        if test_df is None:
            log_error("No test data found")
            return {}
        
        # Prepare features and targets
        X_test, y_test = self.prepare_features_and_targets(test_df)
        if X_test is None or y_test is None:
            return {}
        
        # Make predictions
        model = self.models[model_name]
        y_pred = model.predict(X_test)
        
        # Calculate metrics
        rmse = np.sqrt(np.mean((y_test - y_pred) ** 2))
        mae = np.mean(np.abs(y_test - y_pred))
        mape = np.mean(np.abs((y_test - y_pred) / y_test)) * 100
        
        metrics = {
            "RMSE": rmse,
            "MAE": mae,
            "MAPE": mape,
            "test_samples": len(y_test)
        }
        
        log_info(f"Model {model_name} evaluation:")
        log_info(f"  RMSE: {rmse:,.0f}")
        log_info(f"  MAE: {mae:,.0f}")
        log_info(f"  MAPE: {mape:.2f}%")
        log_info(f"  Test samples: {len(y_test)}")
        
        return metrics
    
    def save_model(self, model_name: str, file_path: str = None) -> bool:
        """Save trained model to file"""
        if model_name not in self.models:
            log_error(f"Model {model_name} not found")
            return False
        
        if file_path is None:
            models_dir = Path(__file__).parent / "backend" / "models"
            models_dir.mkdir(exist_ok=True)
            file_path = models_dir / f"{model_name}.pkl"
        
        try:
            model = self.models[model_name]
            model.save_model(str(file_path))
            log_info(f"Model {model_name} saved to {file_path}")
            return True
        except Exception as e:
            log_error(f"Failed to save model {model_name}: {e}")
            return False
    
    def train_all_models(self) -> bool:
        """Train models for all horizons"""
        horizons = [1, 2, 3]
        success_count = 0
        
        for horizon in horizons:
            model_name = f"catboost_H{horizon}_mongodb"
            if self.train_model(horizon, model_name):
                success_count += 1
                
                # Evaluate model
                metrics = self.evaluate_model(horizon, model_name)
                
                # Save model
                self.save_model(model_name)
        
        log_info(f"Trained {success_count}/{len(horizons)} models successfully")
        return success_count == len(horizons)


def main():
    """Main training function"""
    log_info("🚀 Starting MongoDB-based model training...")
    
    # Initialize trainer
    trainer = MongoDBTrainer()
    
    try:
        # Train all models
        success = trainer.train_all_models()
        
        if success:
            log_info("🎉 All models trained successfully!")
            
            # Print summary
            log_info("📊 Training Summary:")
            for model_name in trainer.models.keys():
                log_info(f"  ✅ {model_name}")
            
            log_info("\n🔍 Next steps:")
            log_info("1. Models are saved in backend/models/")
            log_info("2. Update your prediction endpoints to use these models")
            log_info("3. Test the models with new data")
            
        else:
            log_error("❌ Some models failed to train")
            
    except Exception as e:
        log_error(f"Training failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Close data loader
        trainer.data_loader.close()


if __name__ == "__main__":
    main()
