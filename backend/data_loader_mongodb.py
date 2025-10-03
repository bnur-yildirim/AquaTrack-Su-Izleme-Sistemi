"""
MongoDB-based data loading module - replaces file-based data_loader.py
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import sys
import os
try:
    from dotenv import load_dotenv  # type: ignore
    load_dotenv()
except Exception:
    pass

# Add current directory to path for imports
sys.path.append(os.path.dirname(__file__))

from database import get_client, get_db
from utils import log_info, log_error


class MongoDBDataLoader:
    """MongoDB-based data loader"""
    
    def __init__(self, db_name="aquatrack"):
        env_db_name = os.getenv("MONGODB_DB_NAME")
        effective_db_name = env_db_name or db_name
        self.client = get_client(os.getenv("MONGODB_URI"))
        self.db = get_db(self.client, effective_db_name)
        self._cache = {}
        self._cache_timestamps = {}
        self.cache_ttl = int(os.getenv("CACHE_TTL_SECONDS"))
    
    def _is_cache_valid(self, cache_key: str) -> bool:
        """Check if cache is still valid"""
        if cache_key not in self._cache_timestamps:
            return False
        return (datetime.now() - self._cache_timestamps[cache_key]).seconds < self.cache_ttl
    
    def _get_cached_data(self, cache_key: str, fetch_func, *args, **kwargs):
        """Get data from cache or fetch if expired"""
        if self._is_cache_valid(cache_key):
            log_info(f"Using cached data for {cache_key}")
            return self._cache[cache_key]
        
        data = fetch_func(*args, **kwargs)
        self._cache[cache_key] = data
        self._cache_timestamps[cache_key] = datetime.now()
        return data
    
    def get_lake_predictions(self, lake_id: int) -> Optional[pd.DataFrame]:
        """Get predictions for a specific lake from MongoDB"""
        cache_key = f"predictions_{lake_id}"
        
        def fetch_predictions():
            log_info(f"Loading predictions for lake {lake_id} from MongoDB")
            
            # Try to get from training data first (more recent)
            training_data = list(self.db["training_data"].find({
                "lake_id": lake_id,
                "target_water_area_m2": {"$ne": None}
            }))
            
            if training_data:
                df = pd.DataFrame(training_data)
                # Convert date back to datetime
                df['date'] = pd.to_datetime(df['date'])
                # Rename target column for compatibility
                df['target_water_area_m2'] = df['target_water_area_m2']
                log_info(f"Loaded {len(df)} training records for lake {lake_id}")
                return df
            
            # Fallback to prediction history + merge observations for actuals
            predictions = list(self.db["model_prediction_history"].find({
                "lake_id": lake_id
            }))
            
            if predictions:
                df_pred = pd.DataFrame(predictions)
                df_pred['date'] = pd.to_datetime(df_pred['date'])
                # Extract predicted column from outputs with robust key handling
                def extract_pred(outputs):
                    if not isinstance(outputs, dict):
                        return np.nan
                    for key in [
                        'predicted_water_area_m2',
                        'water_area_m2',
                        'predicted_water_area'
                    ]:
                        if key in outputs:
                            return outputs.get(key)
                    return np.nan
                if 'outputs' in df_pred.columns:
                    df_pred['predicted_water_area_m2'] = df_pred['outputs'].apply(extract_pred)

                # Load observations for actuals
                obs = list(self.db["water_quantity_observations"].find({
                    "lake_id": lake_id
                }, {"_id": 0, "date": 1, "water_area_m2": 1}))
                df_obs = pd.DataFrame(obs) if obs else pd.DataFrame(columns=["date", "water_area_m2"])
                if not df_obs.empty:
                    # Convert epoch ms to datetime if numeric
                    if np.issubdtype(df_obs['date'].dtype, np.number):
                        df_obs['date'] = pd.to_datetime(df_obs['date'], unit='ms')
                    else:
                        df_obs['date'] = pd.to_datetime(df_obs['date'])
                    df_obs = df_obs.rename(columns={"water_area_m2": "target_water_area_m2"})

                # Merge on date to align actuals and predictions
                df = pd.merge(df_pred[["date", "predicted_water_area_m2"]], df_obs, on="date", how="outer")
                df = df.sort_values('date')
                log_info(f"Loaded {len(df)} prediction records for lake {lake_id} (with merged observations)")
                return df
            
            log_error(f"No predictions found for lake {lake_id}")
            return None
        
        return self._get_cached_data(cache_key, fetch_predictions)
    
    def get_all_predictions(self) -> Optional[pd.DataFrame]:
        """Get all predictions from MongoDB"""
        cache_key = "all_predictions"
        
        def fetch_all_predictions():
            log_info("Loading all predictions from MongoDB")
            
            # Get from training data
            training_data = list(self.db["training_data"].find({
                "target_water_area_m2": {"$ne": None}
            }))
            
            if training_data:
                df = pd.DataFrame(training_data)
                df['date'] = pd.to_datetime(df['date'])
                log_info(f"Loaded {len(df)} training records")
                return df
            
            # Fallback to prediction history + merge observations for actuals
            predictions = list(self.db["model_prediction_history"].find({
                "prediction_type": "water_quantity"
            }))
            
            if predictions:
                df_pred = pd.DataFrame(predictions)
                df_pred['date'] = pd.to_datetime(df_pred['date'])
                def extract_pred(outputs):
                    if not isinstance(outputs, dict):
                        return np.nan
                    for key in [
                        'predicted_water_area_m2',
                        'water_area_m2',
                        'predicted_water_area'
                    ]:
                        if key in outputs:
                            return outputs.get(key)
                    return np.nan
                if 'outputs' in df_pred.columns:
                    df_pred['predicted_water_area_m2'] = df_pred['outputs'].apply(extract_pred)

                obs = list(self.db["water_quantity_observations"].find({}, {"_id": 0, "lake_id": 1, "date": 1, "water_area_m2": 1}))
                df_obs = pd.DataFrame(obs) if obs else pd.DataFrame(columns=["lake_id", "date", "water_area_m2"])
                if not df_obs.empty:
                    if np.issubdtype(df_obs['date'].dtype, np.number):
                        df_obs['date'] = pd.to_datetime(df_obs['date'], unit='ms')
                    else:
                        df_obs['date'] = pd.to_datetime(df_obs['date'])
                    df_obs = df_obs.rename(columns={"water_area_m2": "target_water_area_m2"})

                df = pd.merge(df_pred[["lake_id", "date", "predicted_water_area_m2"]], df_obs, on=["lake_id", "date"], how="left")
                df = df.sort_values(['lake_id', 'date'])
                log_info(f"Loaded {len(df)} prediction records with observations merged")
                return df
            
            log_error("No predictions found in database")
            return None
        
        return self._get_cached_data(cache_key, fetch_all_predictions)
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get model metrics from MongoDB"""
        cache_key = "model_metrics"
        
        def fetch_metrics():
            log_info("Loading model metrics from MongoDB")
            
            models = list(self.db["model_metadata"].find({"status": "active"}))
            metrics = {}
            
            for model in models:
                model_id = model.get("model_id", "unknown")
                metrics[model_id] = {
                    "performance": model.get("performance", {}),
                    "parameters": model.get("parameters", {}),
                    "version": model.get("version", "1.0")
                }
            
            log_info(f"Loaded metrics for {len(metrics)} models")
            return metrics
        
        return self._get_cached_data(cache_key, fetch_metrics)
    
    def get_lake_data_points(self) -> Dict[int, int]:
        """Get data point counts per lake"""
        cache_key = "lake_data_points"
        
        def fetch_data_points():
            log_info("Calculating data points per lake")
            
            # Count from training data
            pipeline = [
                {"$match": {"target_water_area_m2": {"$ne": None}}},
                {"$group": {"_id": "$lake_id", "count": {"$sum": 1}}}
            ]
            
            results = list(self.db["training_data"].aggregate(pipeline))
            data_points = {result["_id"]: result["count"] for result in results}
            
            log_info(f"Found data points for {len(data_points)} lakes")
            return data_points
        
        return self._get_cached_data(cache_key, fetch_data_points)
    
    def get_lakes(self) -> Dict[str, Dict]:
        """Get all lakes from MongoDB"""
        cache_key = "lakes"
        
        def fetch_lakes():
            log_info("Loading lakes from MongoDB")
            
            lakes = list(self.db["lakes"].find())
            
            if lakes:
                # Convert to the format expected by the app
                lakes_dict = {}
                for lake in lakes:
                    # Create a key from the lake name (lowercase, replace spaces with underscores)
                    key = lake["name"].lower().replace(" ", "_").replace("ğ", "g").replace("ü", "u").replace("ş", "s").replace("ı", "i").replace("ö", "o").replace("ç", "c")
                    key = key.replace("gölü", "").strip("_")  # Remove "gölü" suffix
                    
                    lakes_dict[key] = {
                        "id": lake["lake_id"],
                        "name": lake["name"],
                        "lat": lake["location"]["lat"],
                        "lng": lake["location"]["lon"],
                        "area_km2": lake.get("area_km2"),
                        "basin": lake.get("basin"),
                        "altitude_m": lake.get("altitude_m"),
                        "extra_info": lake.get("extra_info", {})
                    }
                
                log_info(f"Loaded {len(lakes_dict)} lakes from database")
                return lakes_dict
            
            log_error("No lakes found in database")
            return {}
        
        return self._get_cached_data(cache_key, fetch_lakes)
    
    def get_training_data(self, split_type: str = None, horizon: int = None, lake_id: int = None) -> Optional[pd.DataFrame]:
        """Get training data from MongoDB"""
        cache_key = f"training_data_{split_type}_{horizon}_{lake_id}"
        
        def fetch_training_data():
            log_info(f"Loading training data: split={split_type}, horizon={horizon}, lake_id={lake_id}")
            
            query = {}
            if split_type:
                query["split_type"] = split_type
            if horizon:
                query["horizon"] = horizon
            if lake_id:
                query["lake_id"] = lake_id
            
            training_data = list(self.db["training_data"].find(query))
            
            if training_data:
                df = pd.DataFrame(training_data)
                df['date'] = pd.to_datetime(df['date'])
                log_info(f"Loaded {len(df)} training records")
                return df
            
            log_error("No training data found")
            return None
        
        return self._get_cached_data(cache_key, fetch_training_data)
    
    def get_water_quality_parameters(self, lake_id: int = None) -> Dict[int, Dict[str, float]]:
        """Get water quality parameters from MongoDB"""
        cache_key = f"quality_params_{lake_id}"
        
        def fetch_quality_params():
            log_info(f"Loading water quality parameters for lake {lake_id}")
            
            query = {}
            if lake_id:
                query["lake_id"] = lake_id
            
            params = list(self.db["water_quality_parameters"].find(query))
            quality_params = {param["lake_id"]: param["parameters"] for param in params}
            
            log_info(f"Loaded quality parameters for {len(quality_params)} lakes")
            return quality_params
        
        return self._get_cached_data(cache_key, fetch_quality_params)
    
    def get_spectral_profiles(self, lake_id: int = None) -> Dict[int, Dict[str, float]]:
        """Get spectral profiles from MongoDB"""
        cache_key = f"spectral_profiles_{lake_id}"
        
        def fetch_spectral_profiles():
            log_info(f"Loading spectral profiles for lake {lake_id}")
            
            query = {}
            if lake_id:
                query["lake_id"] = lake_id
            
            profiles = list(self.db["spectral_profiles"].find(query))
            spectral_profiles = {profile["lake_id"]: profile["bands"] for profile in profiles}
            
            log_info(f"Loaded spectral profiles for {len(spectral_profiles)} lakes")
            return spectral_profiles
        
        return self._get_cached_data(cache_key, fetch_spectral_profiles)
    
    def get_quality_scores(self, lake_id: int = None) -> Dict[int, float]:
        """Get quality scores from MongoDB"""
        cache_key = f"quality_scores_{lake_id}"
        
        def fetch_quality_scores():
            log_info(f"Loading quality scores for lake {lake_id}")
            
            query = {}
            if lake_id:
                query["lake_id"] = lake_id
            
            scores = list(self.db["quality_scores"].find(query))
            quality_scores = {score["lake_id"]: score["base_score"] for score in scores}
            
            log_info(f"Loaded quality scores for {len(quality_scores)} lakes")
            return quality_scores
        
        return self._get_cached_data(cache_key, fetch_quality_scores)
    
    def get_system_config(self, config_type: str = None) -> Dict[str, Any]:
        """Get system configuration from MongoDB"""
        cache_key = f"system_config_{config_type}"
        
        def fetch_system_config():
            log_info(f"Loading system configuration: {config_type}")
            
            query = {}
            if config_type:
                query["config_type"] = config_type
            
            configs = list(self.db["system_config"].find(query))
            system_config = {config["config_type"]: config["settings"] for config in configs}
            
            log_info(f"Loaded {len(system_config)} configuration entries")
            return system_config
        
        return self._get_cached_data(cache_key, fetch_system_config)
    
    def clear_cache(self):
        """Clear all cached data"""
        self._cache.clear()
        self._cache_timestamps.clear()
        log_info("Cache cleared")
    
    def close(self):
        """Close database connection"""
        self.client.close()
        log_info("Database connection closed")


# Global instance for backward compatibility
_data_loader = None

def get_data_loader() -> MongoDBDataLoader:
    """Get global data loader instance"""
    global _data_loader
    if _data_loader is None:
        _data_loader = MongoDBDataLoader()
    return _data_loader

# Backward compatibility functions
def get_lake_predictions(lake_id: int) -> Optional[pd.DataFrame]:
    """Get predictions for a specific lake (backward compatibility)"""
    return get_data_loader().get_lake_predictions(lake_id)

def get_predictions() -> Optional[pd.DataFrame]:
    """Get all predictions (backward compatibility)"""
    return get_data_loader().get_all_predictions()

def get_metrics() -> Dict[str, Any]:
    """Get model metrics (backward compatibility)"""
    return get_data_loader().get_metrics()

def get_lake_data_points() -> Dict[int, int]:
    """Get data point counts per lake (backward compatibility)"""
    return get_data_loader().get_lake_data_points()

def load_data() -> bool:
    """Load data (backward compatibility - always returns True for MongoDB)"""
    log_info("MongoDB data loader initialized")
    return True

def is_models_loaded() -> bool:
    """Check if models are loaded (backward compatibility)"""
    metrics = get_metrics()
    return len(metrics) > 0

def get_lakes() -> Dict[str, Dict]:
    """Get all lakes (backward compatibility)"""
    return get_data_loader().get_lakes()
