#!/usr/bin/env python3
"""
Phase 2: Supervised Fine-tuning with PyTorch
Pre-trained Phase 1 modeli kullanarak su kalitesi tahmini
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import pandas as pd
import numpy as np
import rasterio
from pathlib import Path
import logging
from datetime import datetime
import json
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import time

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('data/phase2_training.log'),
        logging.StreamHandler()
    ]
)

class WaterQualityDataset(Dataset):
    """Su kalitesi dataset'i - label'lı verilerle"""
    def __init__(self, csv_file, max_samples=None):
        self.df = pd.read_csv(csv_file)
        if max_samples:
            self.df = self.df.sample(n=min(max_samples, len(self.df)), random_state=42)
        
        # Label encoding
        self.label_mapping = {'good': 0, 'fair': 1, 'excellent': 2}
        self.df['quality_encoded'] = self.df['quality_label'].map(self.label_mapping)
        
        logging.info(f"Dataset loaded: {len(self.df)} samples")
        logging.info(f"Label distribution: {self.df['quality_label'].value_counts().to_dict()}")
    
    def __len__(self):
        return len(self.df)
    
    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        
        try:
            # TIF dosyasını oku
            tif_path = row['file_path']
            with rasterio.open(tif_path) as src:
                data = src.read(1)  # İlk band'ı al
                
                # Normalize et
                data = data.astype(np.float32)
                if data.max() > 0:
                    data = data / data.max()
                
                # 64x64 boyutuna resize et
                from scipy.ndimage import zoom
                if data.shape[0] > 64 or data.shape[1] > 64:
                    zoom_factor = (64 / data.shape[0], 64 / data.shape[1])
                    data = zoom(data, zoom_factor, order=1)
                elif data.shape[0] < 64 or data.shape[1] < 64:
                    # Pad yap
                    pad_h = max(0, 64 - data.shape[0])
                    pad_w = max(0, 64 - data.shape[1])
                    data = np.pad(data, ((0, pad_h), (0, pad_w)), mode='constant')
                
                # 64x64 olduğundan emin ol
                data = data[:64, :64]
                
                # Tensor'a dönüştür (1 channel)
                img_tensor = torch.FloatTensor(data).unsqueeze(0)
        
        except Exception as e:
            # Hata durumunda sıfır tensor döndür
            img_tensor = torch.zeros(1, 64, 64)
        
        # Label ve ekstra features
        label = int(row['quality_encoded'])
        quality_score = float(row.get('quality_score', 0.5))
        
        return img_tensor, label, quality_score

class WaterQualityClassifier(nn.Module):
    """Su kalitesi sınıflandırma modeli (Phase 1'den fine-tune)"""
    def __init__(self, num_classes=3):
        super(WaterQualityClassifier, self).__init__()
        
        # Phase 1'den gelen encoder (frozen)
        self.encoder = nn.Sequential(
            nn.Conv2d(1, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.MaxPool2d(2),
            
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.MaxPool2d(2),
            
            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.MaxPool2d(2),
            
            nn.Conv2d(128, 256, kernel_size=3, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(),
            nn.AdaptiveAvgPool2d(1)
        )
        
        # Classification head (yeni, train edilecek)
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, num_classes)
        )
        
        # Regression head (quality score için)
        self.regressor = nn.Sequential(
            nn.Flatten(),
            nn.Linear(256, 64),
            nn.ReLU(),
            nn.Linear(64, 1),
            nn.Sigmoid()  # 0-1 arası score
        )
    
    def forward(self, x):
        features = self.encoder(x)
        
        # Classification
        class_logits = self.classifier(features)
        
        # Regression
        quality_score = self.regressor(features)
        
        return class_logits, quality_score

def load_phase1_model(model, phase1_path):
    """Phase 1 model'ini yükle"""
    try:
        checkpoint = torch.load(phase1_path, map_location='cpu')
        
        # Eğer state_dict varsa yükle
        if 'encoder_state_dict' in checkpoint:
            model.encoder.load_state_dict(checkpoint['encoder_state_dict'], strict=False)
            logging.info("Phase 1 encoder loaded successfully!")
        else:
            logging.warning("Phase 1 checkpoint bulunamadi, rastgele agirlıklarla baslaniyor")
        
        return model
    except Exception as e:
        logging.warning(f"Phase 1 model yukleme hatasi: {e}")
        logging.info("Rastgele agirlıklarla devam ediliyor")
        return model

def train_phase2(model, train_loader, val_loader, device, epochs=10):
    """Phase 2 eğitimi"""
    
    # Loss fonksiyonları
    criterion_class = nn.CrossEntropyLoss()
    criterion_reg = nn.MSELoss()
    
    # Optimizer - sadece classification ve regression head'leri train et
    # Encoder'ı freeze et (isteğe bağlı)
    for param in model.encoder.parameters():
        param.requires_grad = False  # Phase 1 features'ları koru
    
    optimizer = optim.Adam([
        {'params': model.classifier.parameters()},
        {'params': model.regressor.parameters()}
    ], lr=0.001)
    
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', patience=2, factor=0.5)
    
    best_val_loss = float('inf')
    history = {'train_loss': [], 'val_loss': [], 'train_acc': [], 'val_acc': []}
    
    logging.info("=" * 60)
    logging.info("PHASE 2: SUPERVISED FINE-TUNING BASLATILIYOR")
    logging.info("=" * 60)
    
    for epoch in range(epochs):
        epoch_start = time.time()
        
        # Training
        model.train()
        train_loss = 0.0
        train_correct = 0
        train_total = 0
        
        for batch_idx, (images, labels, scores) in enumerate(train_loader):
            images = images.to(device)
            labels = labels.to(device)
            scores = scores.to(device).float().unsqueeze(1)
            
            optimizer.zero_grad()
            
            class_logits, pred_scores = model(images)
            
            # Combined loss
            loss_class = criterion_class(class_logits, labels)
            loss_reg = criterion_reg(pred_scores, scores)
            loss = loss_class + 0.3 * loss_reg  # Classification ağırlıklı
            
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item()
            
            # Accuracy
            _, predicted = torch.max(class_logits, 1)
            train_total += labels.size(0)
            train_correct += (predicted == labels).sum().item()
            
            if batch_idx % 100 == 0:
                logging.info(f"Epoch {epoch+1}/{epochs}, Batch {batch_idx}/{len(train_loader)}, "
                           f"Loss: {loss.item():.4f}, Acc: {100*train_correct/train_total:.2f}%")
        
        train_loss /= len(train_loader)
        train_acc = 100 * train_correct / train_total
        
        # Validation
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0
        
        with torch.no_grad():
            for images, labels, scores in val_loader:
                images = images.to(device)
                labels = labels.to(device)
                scores = scores.to(device).float().unsqueeze(1)
                
                class_logits, pred_scores = model(images)
                
                loss_class = criterion_class(class_logits, labels)
                loss_reg = criterion_reg(pred_scores, scores)
                loss = loss_class + 0.3 * loss_reg
                
                val_loss += loss.item()
                
                _, predicted = torch.max(class_logits, 1)
                val_total += labels.size(0)
                val_correct += (predicted == labels).sum().item()
        
        val_loss /= len(val_loader)
        val_acc = 100 * val_correct / val_total
        
        # History
        history['train_loss'].append(train_loss)
        history['val_loss'].append(val_loss)
        history['train_acc'].append(train_acc)
        history['val_acc'].append(val_acc)
        
        # Learning rate scheduling
        scheduler.step(val_loss)
        
        epoch_time = time.time() - epoch_start
        
        logging.info(f"Epoch {epoch+1}/{epochs} tamamlandi - "
                   f"Train Loss: {train_loss:.4f}, Train Acc: {train_acc:.2f}%, "
                   f"Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.2f}%, "
                   f"Time: {epoch_time:.1f}s")
        
        # En iyi modeli kaydet
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            torch.save({
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'val_loss': val_loss,
                'val_acc': val_acc,
            }, 'models/water_quality_phase2_model.pth')
            logging.info(f"En iyi model kaydedildi! Val Loss: {val_loss:.4f}")
    
    return model, history

def evaluate_model(model, test_loader, device):
    """Modeli test set'inde değerlendir"""
    model.eval()
    
    all_labels = []
    all_predictions = []
    all_scores = []
    all_pred_scores = []
    
    with torch.no_grad():
        for images, labels, scores in test_loader:
            images = images.to(device)
            
            class_logits, pred_scores = model(images)
            _, predicted = torch.max(class_logits, 1)
            
            all_labels.extend(labels.cpu().numpy())
            all_predictions.extend(predicted.cpu().numpy())
            all_scores.extend(scores.cpu().numpy())
            all_pred_scores.extend(pred_scores.cpu().numpy())
    
    # Metrics
    accuracy = accuracy_score(all_labels, all_predictions)
    
    label_names = ['good', 'fair', 'excellent']
    report = classification_report(all_labels, all_predictions, 
                                  target_names=label_names, output_dict=True)
    
    cm = confusion_matrix(all_labels, all_predictions)
    
    logging.info("=" * 60)
    logging.info("TEST SET SONUCLARI")
    logging.info("=" * 60)
    logging.info(f"Accuracy: {accuracy:.4f}")
    logging.info(f"\nClassification Report:")
    logging.info(classification_report(all_labels, all_predictions, target_names=label_names))
    logging.info(f"\nConfusion Matrix:")
    logging.info(cm)
    
    return {
        'accuracy': accuracy,
        'classification_report': report,
        'confusion_matrix': cm.tolist()
    }

def main():
    """Ana fonksiyon"""
    
    # Device
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    logging.info(f"Device: {device}")
    
    if torch.cuda.is_available():
        logging.info(f"GPU: {torch.cuda.get_device_name(0)}")
        logging.info(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")
    
    # Datasets (daha küçük subset ile başla - hız için)
    logging.info("Dataset'ler yukleniyor...")
    train_dataset = WaterQualityDataset('data/complete_train_dataset.csv', max_samples=10000)
    val_dataset = WaterQualityDataset('data/complete_val_dataset.csv', max_samples=2000)
    test_dataset = WaterQualityDataset('data/complete_test_dataset.csv', max_samples=2000)
    
    # DataLoaders
    train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False, num_workers=0)
    test_loader = DataLoader(test_dataset, batch_size=32, shuffle=False, num_workers=0)
    
    # Model
    model = WaterQualityClassifier(num_classes=3).to(device)
    
    # Phase 1 model'ini yükle
    phase1_path = 'models/water_quality_phase1_model.pth'
    if Path(phase1_path).exists():
        model = load_phase1_model(model, phase1_path)
    
    # Eğitim
    start_time = time.time()
    model, history = train_phase2(model, train_loader, val_loader, device, epochs=10)
    total_time = time.time() - start_time
    
    # Test evaluation
    results = evaluate_model(model, test_loader, device)
    
    # Sonuçları kaydet
    summary = {
        'model_name': 'Water Quality Phase 2 Model',
        'model_type': 'Supervised Fine-tuning',
        'train_samples': len(train_dataset),
        'val_samples': len(val_dataset),
        'test_samples': len(test_dataset),
        'epochs': 10,
        'batch_size': 32,
        'total_time_seconds': total_time,
        'test_accuracy': results['accuracy'],
        'device': str(device),
        'model_path': 'models/water_quality_phase2_model.pth',
        'created_at': datetime.now().isoformat(),
        'history': history,
        'test_results': results
    }
    
    with open('data/water_quality_phase2_summary.json', 'w') as f:
        json.dump(summary, f, indent=2)
    
    logging.info("=" * 60)
    logging.info("PHASE 2 TAMAMLANDI!")
    logging.info(f"Toplam sure: {total_time:.1f} saniye ({total_time/60:.1f} dakika)")
    logging.info(f"Test Accuracy: {results['accuracy']:.4f}")
    logging.info(f"Model: models/water_quality_phase2_model.pth")
    logging.info("=" * 60)
    
    return model, history, results

if __name__ == "__main__":
    model, history, results = main()
