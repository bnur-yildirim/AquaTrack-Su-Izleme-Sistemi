#!/usr/bin/env python3
"""
LSTM VE PROPHET MODELLERİ
Time series için özel modeller
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
import warnings
warnings.filterwarnings('ignore')

def lstm_water_quantity_model():
    """LSTM modeli ile su miktarı tahmini"""
    print("=" * 60)
    print("LSTM MODEL - SU MİKTARI TAHMİNİ")
    print("=" * 60)
    
    try:
        import tensorflow as tf
        print("✅ TensorFlow yüklü - LSTM modeli oluşturuluyor...")
        
        # TensorFlow import'ları
        from tensorflow.keras.models import Sequential
        from tensorflow.keras.layers import LSTM, Dense, Dropout
        from tensorflow.keras.optimizers import Adam
        from tensorflow.keras.callbacks import EarlyStopping
        
    except Exception as e:
        print(f"❌ TensorFlow import hatası: {e}")
        return None
    
    # Veriyi yükle
    train_df = pd.read_parquet('water_quantity/output/train_combined.parquet')
    val_df = pd.read_parquet('water_quantity/output/val_combined.parquet')
    test_df = pd.read_parquet('water_quantity/output/test_combined.parquet')
    
    # Basit feature hazırlama (LSTM için)
    def prepare_lstm_features(df):
        df = df.copy()
        target_col = "target_water_area_m2"
        
        # Lag features
        for lag in [1, 2, 3, 6, 12]:  # 1, 2, 3, 6, 12 ay geri
            df[f'lag_{lag}'] = df.groupby('lake_id')[target_col].shift(lag)
        
        # Rolling features
        df['rolling_mean_6'] = df.groupby('lake_id')[target_col].shift(1).rolling(6, min_periods=1).mean()
        df['rolling_std_6'] = df.groupby('lake_id')[target_col].shift(1).rolling(6, min_periods=1).std()
        
        # Eksik değerleri doldur
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        for col in numeric_cols:
            df[col] = df[col].fillna(df[col].median())
        
        return df
    
    train_df = prepare_lstm_features(train_df)
    val_df = prepare_lstm_features(val_df)
    test_df = prepare_lstm_features(test_df)
    
    # Feature seçimi
    exclude_cols = ['lake_id', 'date', 'target_water_area_m2']
    feature_cols = []
    for c in train_df.columns:
        if c not in exclude_cols:
            if pd.api.types.is_numeric_dtype(train_df[c]):
                feature_cols.append(c)
    
    X_train = train_df[feature_cols]
    y_train = train_df['target_water_area_m2']
    X_val = val_df[feature_cols]
    y_val = val_df['target_water_area_m2']
    X_test = test_df[feature_cols]
    y_test = test_df['target_water_area_m2']
    
    # Infinity ve NaN temizle
    for df in [X_train, X_val, X_test]:
        df.replace([np.inf, -np.inf], np.nan, inplace=True)
        df.fillna(0, inplace=True)
    
    # Normalize
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    X_test_scaled = scaler.transform(X_test)
    
    # LSTM için sequence oluştur (basit yaklaşım)
    def create_sequences(X, y, seq_length=12):
        X_seq, y_seq = [], []
        for i in range(seq_length, len(X)):
            X_seq.append(X[i-seq_length:i])
            y_seq.append(y.iloc[i])
        return np.array(X_seq), np.array(y_seq)
    
    seq_length = 12
    X_train_seq, y_train_seq = create_sequences(pd.DataFrame(X_train_scaled), y_train, seq_length)
    X_val_seq, y_val_seq = create_sequences(pd.DataFrame(X_val_scaled), y_val, seq_length)
    X_test_seq, y_test_seq = create_sequences(pd.DataFrame(X_test_scaled), y_test, seq_length)
    
    print(f"LSTM Sequence shapes:")
    print(f"Train: X={X_train_seq.shape}, y={y_train_seq.shape}")
    print(f"Val: X={X_val_seq.shape}, y={y_val_seq.shape}")
    print(f"Test: X={X_test_seq.shape}, y={y_test_seq.shape}")
    
    # LSTM model oluştur
    model = Sequential([
        LSTM(64, return_sequences=True, input_shape=(seq_length, len(feature_cols))),
        Dropout(0.2),
        LSTM(32, return_sequences=False),
        Dropout(0.2),
        Dense(16, activation='relu'),
        Dropout(0.1),
        Dense(1)
    ])
    
    model.compile(optimizer=Adam(learning_rate=0.001), loss='mse', metrics=['mae'])
    
    # Early stopping
    early_stopping = EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True)
    
    print("\nLSTM model eğitimi başlıyor...")
    
    # Model eğit
    history = model.fit(
        X_train_seq, y_train_seq,
        validation_data=(X_val_seq, y_val_seq),
        epochs=50,
        batch_size=32,
        callbacks=[early_stopping],
        verbose=0
    )
    
    # Predictions
    train_pred = model.predict(X_train_seq, verbose=0).flatten()
    val_pred = model.predict(X_val_seq, verbose=0).flatten()
    test_pred = model.predict(X_test_seq, verbose=0).flatten()
    
    # Metrics
    train_rmse = np.sqrt(mean_squared_error(y_train_seq, train_pred))
    val_rmse = np.sqrt(mean_squared_error(y_val_seq, val_pred))
    test_rmse = np.sqrt(mean_squared_error(y_test_seq, test_pred))
    
    train_r2 = r2_score(y_train_seq, train_pred)
    val_r2 = r2_score(y_val_seq, val_pred)
    test_r2 = r2_score(y_test_seq, test_pred)
    
    train_mae = mean_absolute_error(y_train_seq, train_pred)
    val_mae = mean_absolute_error(y_val_seq, val_pred)
    test_mae = mean_absolute_error(y_test_seq, test_pred)
    
    overfitting_gap = train_rmse - val_rmse
    
    print(f"\nLSTM Results:")
    print(f"Train: RMSE={train_rmse:.0f}, R²={train_r2:.4f}, MAE={train_mae:.0f}")
    print(f"Val:   RMSE={val_rmse:.0f}, R²={val_r2:.4f}, MAE={val_mae:.0f}")
    print(f"Test:  RMSE={test_rmse:.0f}, R²={test_r2:.4f}, MAE={test_mae:.0f}")
    print(f"Overfit Gap: {overfitting_gap:.0f}")
    
    if abs(overfitting_gap) < 10000000:
        print("✅ İyi generalizasyon")
    elif overfitting_gap < -20000000:
        print("❌ Overfitting")
    else:
        print("⚠️  Hafif overfitting")
    
    lstm_results = {
        'model': 'LSTM',
        'train_rmse': train_rmse,
        'val_rmse': val_rmse,
        'test_rmse': test_rmse,
        'train_r2': train_r2,
        'val_r2': val_r2,
        'test_r2': test_r2,
        'train_mae': train_mae,
        'val_mae': val_mae,
        'test_mae': test_mae,
        'overfitting_gap': overfitting_gap
    }
    
    return lstm_results

def prophet_water_quantity_model():
    """Prophet modeli ile su miktarı tahmini"""
    print("\n" + "=" * 60)
    print("PROPHET MODEL - SU MİKTARI TAHMİNİ")
    print("=" * 60)
    
    try:
        from prophet import Prophet
        print("✅ Prophet yüklü - Prophet modeli oluşturuluyor...")
    except ImportError:
        print("❌ Prophet yüklü değil - Prophet modeli atlanıyor")
        return None
    
    # Veriyi yükle
    train_df = pd.read_parquet('water_quantity/output/train_combined.parquet')
    val_df = pd.read_parquet('water_quantity/output/val_combined.parquet')
    test_df = pd.read_parquet('water_quantity/output/test_combined.parquet')
    
    # Prophet için veri hazırlama
    def prepare_prophet_data(df):
        df = df.copy()
        # Prophet için gerekli sütunlar: ds (date), y (target)
        df['ds'] = pd.to_datetime(df['date'])
        df['y'] = df['target_water_area_m2']
        
        # Göl bazlı analiz için
        results = {}
        for lake_id in df['lake_id'].unique():
            lake_data = df[df['lake_id'] == lake_id].copy()
            lake_data = lake_data.sort_values('ds')
            results[lake_id] = lake_data[['ds', 'y']].dropna()
        
        return results
    
    # Veriyi hazırla
    train_data = prepare_prophet_data(train_df)
    val_data = prepare_prophet_data(val_df)
    test_data = prepare_prophet_data(test_df)
    
    print(f"Prophet için {len(train_data)} göl verisi hazırlandı")
    
    # Her göl için Prophet modeli
    prophet_results = {}
    all_train_preds = []
    all_val_preds = []
    all_test_preds = []
    all_train_actuals = []
    all_val_actuals = []
    all_test_actuals = []
    
    for lake_id in list(train_data.keys())[:3]:  # İlk 3 göl için (hız için)
        print(f"\nGöl {lake_id} için Prophet modeli...")
        
        # Train data
        train_lake = train_data[lake_id]
        val_lake = val_data.get(lake_id, pd.DataFrame())
        test_lake = test_data.get(lake_id, pd.DataFrame())
        
        if len(train_lake) < 10:  # Yeterli veri yoksa atla
            continue
        
        # Prophet modeli
        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=False,
            daily_seasonality=False,
            seasonality_mode='multiplicative',
            changepoint_prior_scale=0.05,  # Conservative
            seasonality_prior_scale=10.0
        )
        
        # Model eğit
        model.fit(train_lake)
        
        # Gelecek tarihleri oluştur
        if len(val_lake) > 0:
            val_future = pd.DataFrame({'ds': val_lake['ds']})
            val_pred = model.predict(val_future)['yhat'].values
            all_val_preds.extend(val_pred)
            all_val_actuals.extend(val_lake['y'].values)
        
        if len(test_lake) > 0:
            test_future = pd.DataFrame({'ds': test_lake['ds']})
            test_pred = model.predict(test_future)['yhat'].values
            all_test_preds.extend(test_pred)
            all_test_actuals.extend(test_lake['y'].values)
        
        # Train için fit edilmiş değerler
        train_pred = model.predict(pd.DataFrame({'ds': train_lake['ds']}))['yhat'].values
        all_train_preds.extend(train_pred)
        all_train_actuals.extend(train_lake['y'].values)
    
    # Genel metrics
    if len(all_train_preds) > 0:
        train_rmse = np.sqrt(mean_squared_error(all_train_actuals, all_train_preds))
        train_r2 = r2_score(all_train_actuals, all_train_preds)
        train_mae = mean_absolute_error(all_train_actuals, all_train_preds)
    else:
        train_rmse = train_r2 = train_mae = 0
    
    if len(all_val_preds) > 0:
        val_rmse = np.sqrt(mean_squared_error(all_val_actuals, all_val_preds))
        val_r2 = r2_score(all_val_actuals, all_val_preds)
        val_mae = mean_absolute_error(all_val_actuals, all_val_preds)
    else:
        val_rmse = val_r2 = val_mae = 0
    
    if len(all_test_preds) > 0:
        test_rmse = np.sqrt(mean_squared_error(all_test_actuals, all_test_preds))
        test_r2 = r2_score(all_test_actuals, all_test_preds)
        test_mae = mean_absolute_error(all_test_actuals, all_test_preds)
    else:
        test_rmse = test_r2 = test_mae = 0
    
    overfitting_gap = train_rmse - val_rmse
    
    print(f"\nProphet Results:")
    print(f"Train: RMSE={train_rmse:.0f}, R²={train_r2:.4f}, MAE={train_mae:.0f}")
    print(f"Val:   RMSE={val_rmse:.0f}, R²={val_r2:.4f}, MAE={val_mae:.0f}")
    print(f"Test:  RMSE={test_rmse:.0f}, R²={test_r2:.4f}, MAE={test_mae:.0f}")
    print(f"Overfit Gap: {overfitting_gap:.0f}")
    
    if abs(overfitting_gap) < 10000000:
        print("✅ İyi generalizasyon")
    elif overfitting_gap < -20000000:
        print("❌ Overfitting")
    else:
        print("⚠️  Hafif overfitting")
    
    prophet_results = {
        'model': 'Prophet',
        'train_rmse': train_rmse,
        'val_rmse': val_rmse,
        'test_rmse': test_rmse,
        'train_r2': train_r2,
        'val_r2': val_r2,
        'test_r2': test_r2,
        'train_mae': train_mae,
        'val_mae': val_mae,
        'test_mae': test_mae,
        'overfitting_gap': overfitting_gap
    }
    
    return prophet_results

def compare_time_series_models(lstm_results, prophet_results):
    """Time series modellerini karşılaştır"""
    print("\n" + "=" * 60)
    print("TIME SERIES MODELLERİ KARŞILAŞTIRMASI")
    print("=" * 60)
    
    results = []
    if lstm_results:
        results.append(lstm_results)
    if prophet_results:
        results.append(prophet_results)
    
    if not results:
        print("❌ Hiçbir time series modeli çalışmadı")
        return
    
    # DataFrame oluştur
    df_results = pd.DataFrame(results)
    
    # En iyi modeli bul
    df_results['score'] = (
        df_results['val_r2'] * 0.4 +
        (1 - df_results['val_rmse'] / df_results['val_rmse'].max()) * 0.3 +
        (1 - df_results['overfitting_gap'].abs() / df_results['overfitting_gap'].abs().max()) * 0.3
    )
    
    print("TIME SERIES MODEL PERFORMANCE:")
    print("-" * 40)
    
    for _, row in df_results.iterrows():
        print(f"\n{row['model']}:")
        print(f"  Val RMSE: {row['val_rmse']:.0f}")
        print(f"  Val R²:   {row['val_r2']:.4f}")
        print(f"  Overfit:  {row['overfitting_gap']:.0f}")
        print(f"  Score:    {row['score']:.4f}")
    
    best_model = df_results.loc[df_results['score'].idxmax()]
    print(f"\n🏆 EN İYİ TIME SERIES MODEL: {best_model['model']}")
    
    # Görselleştirme
    visualize_time_series_results(df_results)
    
    return df_results

def visualize_time_series_results(df_results):
    """Time series sonuçlarını görselleştir"""
    print("\n" + "=" * 60)
    print("TIME SERIES GÖRSELLEŞTİRME")
    print("=" * 60)
    
    fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(12, 10))
    
    models = df_results['model'].values
    
    # 1. RMSE Comparison
    ax1.bar(models, df_results['val_rmse'], alpha=0.7, color='skyblue')
    ax1.set_ylabel('Validation RMSE')
    ax1.set_title('Validation RMSE by Model')
    ax1.grid(True, alpha=0.3)
    
    # 2. R² Comparison
    ax2.bar(models, df_results['val_r2'], alpha=0.7, color='lightgreen')
    ax2.set_ylabel('Validation R²')
    ax2.set_title('Validation R² by Model')
    ax2.grid(True, alpha=0.3)
    
    # 3. Overfitting Gap
    colors = ['green' if abs(gap) < 10000000 else 'orange' if abs(gap) < 20000000 else 'red' 
              for gap in df_results['overfitting_gap']]
    ax3.bar(models, df_results['overfitting_gap'], alpha=0.7, color=colors)
    ax3.set_ylabel('Overfitting Gap')
    ax3.set_title('Overfitting Gap by Model')
    ax3.grid(True, alpha=0.3)
    ax3.axhline(y=0, color='black', linestyle='-', alpha=0.3)
    
    # 4. Overall Score
    ax4.bar(models, df_results['score'], alpha=0.7, color='purple')
    ax4.set_ylabel('Overall Score')
    ax4.set_title('Overall Score by Model')
    ax4.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig('data/time_series_models_analysis.png', dpi=300, bbox_inches='tight')
    print("✅ Görsel kaydedildi: data/time_series_models_analysis.png")
    plt.show()

def main():
    """Ana fonksiyon"""
    print("\n" + "🧠" * 30)
    print("LSTM VE PROPHET MODELLERİ")
    print("🧠" * 30 + "\n")
    
    # LSTM modeli
    lstm_results = lstm_water_quantity_model()
    
    # Prophet modeli
    prophet_results = prophet_water_quantity_model()
    
    # Karşılaştırma
    time_series_results = compare_time_series_models(lstm_results, prophet_results)
    
    print("\n" + "=" * 60)
    print("✅ LSTM VE PROPHET MODELLERİ TAMAMLANDI!")
    print("=" * 60)
    
    return lstm_results, prophet_results, time_series_results

if __name__ == "__main__":
    lstm_results, prophet_results, time_series_results = main()
