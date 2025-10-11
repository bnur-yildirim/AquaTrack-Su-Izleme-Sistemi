#!/usr/bin/env python3
"""
Phase 2: IMPROVED Supervised Fine-tuning with PyTorch
İyileştirmeler:
- Class weights & Focal Loss
- Data augmentation
- Partial encoder unfreezing
- Early stopping
- Better dropout
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
from scipy.ndimage import zoom, rotate, gaussian_filter

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('data/phase2_improved_training.log'),
        logging.StreamHandler()
    ]
)

class WaterQualityDataset(Dataset):
    """Su kalitesi dataset'i - DATA AUGMENTATION ile"""
    def __init__(self, csv_file, max_samples=None, augment=False):
        self.df = pd.read_csv(csv_file)
        if max_samples:
            self.df = self.df.sample(n=min(max_samples, len(self.df)), random_state=42)
        
        self.augment = augment
        
        # Label encoding
        self.label_mapping = {'good': 0, 'fair': 1, 'excellent': 2}
        self.df['quality_encoded'] = self.df['quality_label'].map(self.label_mapping)
        
        logging.info(f"Dataset loaded: {len(self.df)} samples, Augment: {augment}")
        logging.info(f"Label distribution: {self.df['quality_label'].value_counts().to_dict()}")
    
    def augment_image(self, img):
        """Data augmentation"""
        # Random rotation
        if np.random.rand() > 0.5:
            angle = np.random.uniform(-15, 15)
            img = rotate(img, angle, reshape=False, mode='nearest')
        
        # Random flip
        if np.random.rand() > 0.5:
            img = np.fliplr(img)
        if np.random.rand() > 0.5:
            img = np.flipud(img)
        
        # Random noise
        if np.random.rand() > 0.5:
            noise = np.random.normal(0, 0.02, img.shape)
            img = img + noise
            img = np.clip(img, 0, 1)
        
        # Random brightness
        if np.random.rand() > 0.5:
            brightness = np.random.uniform(0.8, 1.2)
            img = img * brightness
            img = np.clip(img, 0, 1)
        
        # Random blur
        if np.random.rand() > 0.7:
            sigma = np.random.uniform(0.5, 1.0)
            img = gaussian_filter(img, sigma=sigma)
        
        return img
    
    def __len__(self):
        return len(self.df)
    
    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        
        try:
            # TIF dosyasını oku
            tif_path = row['file_path']
            with rasterio.open(tif_path) as src:
                data = src.read(1)
                
                # Normalize et
                data = data.astype(np.float32)
                if data.max() > 0:
                    data = data / data.max()
                
                # 64x64 boyutuna resize et
                if data.shape[0] > 64 or data.shape[1] > 64:
                    zoom_factor = (64 / data.shape[0], 64 / data.shape[1])
                    data = zoom(data, zoom_factor, order=1)
                elif data.shape[0] < 64 or data.shape[1] < 64:
                    pad_h = max(0, 64 - data.shape[0])
                    pad_w = max(0, 64 - data.shape[1])
                    data = np.pad(data, ((0, pad_h), (0, pad_w)), mode='constant')
                
                data = data[:64, :64]
                
                # Data augmentation
                if self.augment:
                    data = self.augment_image(data)
                
                img_tensor = torch.FloatTensor(data).unsqueeze(0)
        
        except Exception as e:
            img_tensor = torch.zeros(1, 64, 64)
        
        label = int(row['quality_encoded'])
        quality_score = float(row.get('quality_score', 0.5))
        
        return img_tensor, label, quality_score

class FocalLoss(nn.Module):
    """Focal Loss for class imbalance"""
    def __init__(self, alpha=None, gamma=2):
        super(FocalLoss, self).__init__()
        self.alpha = alpha
        self.gamma = gamma
        
    def forward(self, inputs, targets):
        ce_loss = nn.CrossEntropyLoss(weight=self.alpha, reduction='none')(inputs, targets)
        pt = torch.exp(-ce_loss)
        focal_loss = ((1 - pt) ** self.gamma * ce_loss).mean()
        return focal_loss

class WaterQualityClassifier(nn.Module):
    """İYİLEŞTİRİLMİŞ Su kalitesi sınıflandırma modeli"""
    def __init__(self, num_classes=3):
        super(WaterQualityClassifier, self).__init__()
        
        # Encoder (Phase 1'den)
        self.encoder = nn.Sequential(
            nn.Conv2d(1, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Dropout2d(0.1),
            
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Dropout2d(0.15),
            
            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Dropout2d(0.2),
            
            nn.Conv2d(128, 256, kernel_size=3, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(),
            nn.AdaptiveAvgPool2d(1),
            nn.Dropout2d(0.25)
        )
        
        # Classification head - daha güçlü
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(256, 256),
            nn.ReLU(),
            nn.Dropout(0.6),
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Dropout(0.4),
            nn.Linear(64, num_classes)
        )
        
        # Regression head
        self.regressor = nn.Sequential(
            nn.Flatten(),
            nn.Linear(256, 64),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, 1),
            nn.Sigmoid()
        )
    
    def forward(self, x):
        features = self.encoder(x)
        class_logits = self.classifier(features)
        quality_score = self.regressor(features)
        return class_logits, quality_score

def load_phase1_model(model, phase1_path):
    """Phase 1 model'ini DÜZGÜN yükle"""
    try:
        checkpoint = torch.load(phase1_path, map_location='cpu', weights_only=False)
        
        # Farklı checkpoint formatlarını dene
        if 'model_state_dict' in checkpoint:
            # Encoder kısmını çıkar ve yükle
            phase1_state = checkpoint['model_state_dict']
            encoder_state = {}
            
            for key, value in phase1_state.items():
                if 'encoder' in key:
                    new_key = key.replace('encoder.', '')
                    encoder_state[new_key] = value
            
            if encoder_state:
                model.encoder.load_state_dict(encoder_state, strict=False)
                logging.info("Phase 1 encoder loaded successfully!")
                return model, True
        
        elif 'encoder_state_dict' in checkpoint:
            model.encoder.load_state_dict(checkpoint['encoder_state_dict'], strict=False)
            logging.info("Phase 1 encoder loaded successfully!")
            return model, True
        
        # Direkt state_dict ise
        else:
            encoder_state = {}
            for key, value in checkpoint.items():
                if 'encoder' in key or 'conv' in key.lower():
                    encoder_state[key] = value
            
            if encoder_state:
                model.encoder.load_state_dict(encoder_state, strict=False)
                logging.info("Phase 1 encoder loaded successfully!")
                return model, True
        
        logging.warning("Phase 1 checkpoint formatı tanınamadı")
        return model, False
        
    except Exception as e:
        logging.warning(f"Phase 1 model yukleme hatasi: {e}")
        return model, False

def train_improved_phase2(model, train_loader, val_loader, device, epochs=15, class_weights=None):
    """İYİLEŞTİRİLMİŞ Phase 2 eğitimi"""
    
    # Focal Loss with class weights
    if class_weights is not None:
        class_weights = class_weights.to(device)
    criterion_class = FocalLoss(alpha=class_weights, gamma=2)
    criterion_reg = nn.MSELoss()
    
    # PARTIAL UNFREEZING: Son 2 conv layer'ı train et
    for param in model.encoder.parameters():
        param.requires_grad = False
    
    # Son 2 layer'ı unfreeze et
    for layer in model.encoder[-4:]:
        for param in layer.parameters():
            param.requires_grad = True
    
    # Optimizer - differential learning rates
    optimizer = optim.AdamW([
        {'params': model.encoder[-4:].parameters(), 'lr': 0.0001},  # Encoder için küçük LR
        {'params': model.classifier.parameters(), 'lr': 0.001},
        {'params': model.regressor.parameters(), 'lr': 0.001}
    ], weight_decay=0.01)
    
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', patience=3, factor=0.5)
    
    # Early stopping
    best_val_loss = float('inf')
    patience = 5
    patience_counter = 0
    
    history = {'train_loss': [], 'val_loss': [], 'train_acc': [], 'val_acc': []}
    
    logging.info("=" * 60)
    logging.info("IMPROVED PHASE 2: SUPERVISED FINE-TUNING BASLATILIYOR")
    logging.info("=" * 60)
    logging.info(f"Class weights: {class_weights}")
    logging.info(f"Encoder partial unfreezing: SON 4 LAYER")
    
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
            loss = loss_class + 0.2 * loss_reg  # Classification daha ağırlıklı
            
            loss.backward()
            
            # Gradient clipping
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            
            optimizer.step()
            
            train_loss += loss.item()
            
            # Accuracy
            _, predicted = torch.max(class_logits, 1)
            train_total += labels.size(0)
            train_correct += (predicted == labels).sum().item()
            
            if batch_idx % 50 == 0:
                logging.info(f"Epoch {epoch+1}/{epochs}, Batch {batch_idx}/{len(train_loader)}, "
                           f"Loss: {loss.item():.4f}, Acc: {100*train_correct/train_total:.2f}%")
        
        train_loss /= len(train_loader)
        train_acc = 100 * train_correct / train_total
        
        # Validation
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0
        all_preds = []
        all_labels = []
        
        with torch.no_grad():
            for images, labels, scores in val_loader:
                images = images.to(device)
                labels = labels.to(device)
                scores = scores.to(device).float().unsqueeze(1)
                
                class_logits, pred_scores = model(images)
                
                loss_class = criterion_class(class_logits, labels)
                loss_reg = criterion_reg(pred_scores, scores)
                loss = loss_class + 0.2 * loss_reg
                
                val_loss += loss.item()
                
                _, predicted = torch.max(class_logits, 1)
                val_total += labels.size(0)
                val_correct += (predicted == labels).sum().item()
                
                all_preds.extend(predicted.cpu().numpy())
                all_labels.extend(labels.cpu().numpy())
        
        val_loss /= len(val_loader)
        val_acc = 100 * val_correct / val_total
        
        # Per-class accuracy
        val_class_acc = {}
        for cls in [0, 1, 2]:
            cls_mask = np.array(all_labels) == cls
            if cls_mask.sum() > 0:
                cls_correct = (np.array(all_preds)[cls_mask] == cls).sum()
                val_class_acc[cls] = 100 * cls_correct / cls_mask.sum()
        
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
        logging.info(f"Val Class Acc - good: {val_class_acc.get(0, 0):.1f}%, "
                   f"fair: {val_class_acc.get(1, 0):.1f}%, "
                   f"excellent: {val_class_acc.get(2, 0):.1f}%")
        
        # Early stopping & best model save
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            patience_counter = 0
            torch.save({
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'val_loss': val_loss,
                'val_acc': val_acc,
                'val_class_acc': val_class_acc
            }, 'models/water_quality_phase2_improved_model.pth')
            logging.info(f"✅ En iyi model kaydedildi! Val Loss: {val_loss:.4f}")
        else:
            patience_counter += 1
            logging.info(f"⚠️  Patience: {patience_counter}/{patience}")
        
        # Early stopping
        if patience_counter >= patience:
            logging.info(f"🛑 Early stopping at epoch {epoch+1}")
            break
    
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
                                  target_names=label_names, output_dict=True, zero_division=0)
    
    cm = confusion_matrix(all_labels, all_predictions)
    
    # Per-class accuracy
    class_acc = {}
    for cls in range(3):
        cls_mask = np.array(all_labels) == cls
        if cls_mask.sum() > 0:
            cls_correct = (np.array(all_predictions)[cls_mask] == cls).sum()
            class_acc[label_names[cls]] = cls_correct / cls_mask.sum()
    
    logging.info("=" * 60)
    logging.info("TEST SET SONUCLARI")
    logging.info("=" * 60)
    logging.info(f"Overall Accuracy: {accuracy:.4f}")
    logging.info(f"Per-class Accuracy: {class_acc}")
    logging.info(f"\nClassification Report:")
    logging.info(classification_report(all_labels, all_predictions, target_names=label_names, zero_division=0))
    logging.info(f"\nConfusion Matrix:")
    logging.info(cm)
    
    return {
        'accuracy': accuracy,
        'class_accuracy': class_acc,
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
    
    # Datasets - DATA AUGMENTATION aktif
    logging.info("Dataset'ler yukleniyor...")
    train_dataset = WaterQualityDataset('data/complete_train_dataset.csv', max_samples=20000, augment=True)
    val_dataset = WaterQualityDataset('data/complete_val_dataset.csv', max_samples=3000, augment=False)
    test_dataset = WaterQualityDataset('data/complete_test_dataset.csv', max_samples=3000, augment=False)
    
    # Class weights hesapla
    label_counts = train_dataset.df['quality_label'].value_counts()
    total = len(train_dataset)
    class_weights = torch.FloatTensor([
        total / (3 * label_counts.get('good', 1)),
        total / (3 * label_counts.get('fair', 1)),
        total / (3 * label_counts.get('excellent', 1))
    ])
    logging.info(f"Calculated class weights: {class_weights}")
    
    # DataLoaders
    train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False, num_workers=0)
    test_loader = DataLoader(test_dataset, batch_size=32, shuffle=False, num_workers=0)
    
    # Model
    model = WaterQualityClassifier(num_classes=3).to(device)
    
    # Phase 1 model'ini yükle
    phase1_path = 'models/water_quality_phase1_model.pth'
    phase1_loaded = False
    if Path(phase1_path).exists():
        model, phase1_loaded = load_phase1_model(model, phase1_path)
    
    # Eğitim
    start_time = time.time()
    model, history = train_improved_phase2(model, train_loader, val_loader, device, 
                                          epochs=15, class_weights=class_weights)
    total_time = time.time() - start_time
    
    # En iyi modeli yükle
    best_checkpoint = torch.load('models/water_quality_phase2_improved_model.pth', weights_only=False)
    model.load_state_dict(best_checkpoint['model_state_dict'])
    
    # Test evaluation
    results = evaluate_model(model, test_loader, device)
    
    # Sonuçları kaydet
    summary = {
        'model_name': 'Water Quality Phase 2 IMPROVED Model',
        'model_type': 'Supervised Fine-tuning (Improved)',
        'improvements': [
            'Class weights & Focal Loss',
            'Data augmentation',
            'Partial encoder unfreezing',
            'Early stopping',
            'Gradient clipping',
            'Differential learning rates'
        ],
        'phase1_loaded': phase1_loaded,
        'train_samples': len(train_dataset),
        'val_samples': len(val_dataset),
        'test_samples': len(test_dataset),
        'epochs_trained': len(history['train_loss']),
        'max_epochs': 15,
        'batch_size': 32,
        'total_time_seconds': total_time,
        'test_accuracy': results['accuracy'],
        'test_class_accuracy': results['class_accuracy'],
        'best_val_loss': best_checkpoint['val_loss'],
        'best_val_acc': best_checkpoint['val_acc'],
        'device': str(device),
        'model_path': 'models/water_quality_phase2_improved_model.pth',
        'created_at': datetime.now().isoformat(),
        'history': history,
        'test_results': results
    }
    
    with open('data/water_quality_phase2_improved_summary.json', 'w') as f:
        json.dump(summary, f, indent=2)
    
    logging.info("=" * 60)
    logging.info("IMPROVED PHASE 2 TAMAMLANDI!")
    logging.info(f"Toplam sure: {total_time:.1f} saniye ({total_time/60:.1f} dakika)")
    logging.info(f"Test Accuracy: {results['accuracy']:.4f}")
    logging.info(f"Test Class Accuracy: {results['class_accuracy']}")
    logging.info(f"Best Val Acc: {best_checkpoint['val_acc']:.2f}%")
    logging.info(f"Model: models/water_quality_phase2_improved_model.pth")
    logging.info("=" * 60)
    
    return model, history, results

if __name__ == "__main__":
    model, history, results = main()
