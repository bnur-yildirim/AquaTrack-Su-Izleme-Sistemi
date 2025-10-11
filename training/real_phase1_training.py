#!/usr/bin/env python3
"""
Phase 1: Gercek Self-Supervised Pre-training
SimCLR Contrastive Learning ile TIF dosyalari uzerinde egitim
"""

import torch
import torch.nn as nn
import torch.optim as optim
import torchvision.transforms as transforms
from torch.utils.data import Dataset, DataLoader
import pandas as pd
import numpy as np
from pathlib import Path
import logging
import time
from PIL import Image
import rasterio
from sklearn.model_selection import train_test_split
import json
from datetime import datetime

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('data/phase1_training.log'),
        logging.StreamHandler()
    ]
)

class TIFDataset(Dataset):
    """TIF dosyalari icin Dataset"""
    def __init__(self, manifest_path, transform=None, max_samples=None):
        self.manifest_df = pd.read_csv(manifest_path)
        if max_samples:
            self.manifest_df = self.manifest_df.sample(n=min(max_samples, len(self.manifest_df)), random_state=42)
        
        self.transform = transform
        logging.info(f"Dataset yuklendi: {len(self.manifest_df)} dosya")
    
    def __len__(self):
        return len(self.manifest_df)
    
    def __getitem__(self, idx):
        file_path = self.manifest_df.iloc[idx]['file_path']
        
        try:
            # TIF dosyasini oku
            with rasterio.open(file_path) as src:
                # Ilk bandi oku ve normalize et
                band = src.read(1).astype(np.float32)
                
                # NaN degerleri 0 ile degistir
                band = np.nan_to_num(band)
                
                # Min-max normalization
                if band.max() > band.min():
                    band = (band - band.min()) / (band.max() - band.min())
                
                # PIL Image'a cevir
                band_uint8 = (band * 255).astype(np.uint8)
                image = Image.fromarray(band_uint8, mode='L')
                
                # RGB'ye cevir (3 channel icin)
                image = image.convert('RGB')
                
                if self.transform:
                    image = self.transform(image)
                
                return image, idx
                
        except Exception as e:
            logging.warning(f"Dosya okuma hatasi {file_path}: {e}")
            # Hata durumunda siyah goruntu dondur
            if self.transform:
                return self.transform(Image.new('RGB', (64, 64), (0, 0, 0))), idx
            return Image.new('RGB', (64, 64), (0, 0, 0)), idx

class SimCLRModel(nn.Module):
    """SimCLR icin CNN backbone"""
    def __init__(self, input_dim=3, hidden_dim=128, output_dim=64):
        super(SimCLRModel, self).__init__()
        
        # ResNet benzeri basit CNN
        self.encoder = nn.Sequential(
            # Conv layers
            nn.Conv2d(input_dim, 32, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.MaxPool2d(2),
            
            nn.Conv2d(32, 64, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.MaxPool2d(2),
            
            nn.Conv2d(64, 128, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.MaxPool2d(2),
            
            nn.Conv2d(128, 256, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(),
            nn.AdaptiveAvgPool2d((4, 4)),
            
            # Flatten
            nn.Flatten(),
            nn.Linear(256 * 4 * 4, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_dim, output_dim)
        )
        
        # Projection head
        self.projection = nn.Sequential(
            nn.Linear(output_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, output_dim)
        )
    
    def forward(self, x):
        features = self.encoder(x)
        projection = self.projection(features)
        return features, projection

class SimCLRLoss(nn.Module):
    """SimCLR Contrastive Loss"""
    def __init__(self, temperature=0.1):
        super(SimCLRLoss, self).__init__()
        self.temperature = temperature
    
    def forward(self, z1, z2):
        # Normalize
        z1 = nn.functional.normalize(z1, dim=1)
        z2 = nn.functional.normalize(z2, dim=1)
        
        # Similarity matrix
        sim_matrix = torch.matmul(z1, z2.T) / self.temperature
        
        # Labels (diagonal elements are positive pairs)
        labels = torch.arange(z1.size(0)).to(z1.device)
        
        # Loss
        loss = nn.CrossEntropyLoss()(sim_matrix, labels)
        return loss

def get_transforms():
    """Data augmentation transforms"""
    transform = transforms.Compose([
        transforms.Resize((64, 64)),  # MX450 icin kucuk boyut
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomVerticalFlip(p=0.5),
        transforms.RandomRotation(degrees=15),
        transforms.ColorJitter(brightness=0.2, contrast=0.2),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5])
    ])
    return transform

def train_phase1():
    """Phase 1: Self-supervised pre-training"""
    logging.info("=" * 60)
    logging.info("PHASE 1: GERCEK SELF-SUPERVISED PRE-TRAINING")
    logging.info("=" * 60)
    
    # GPU kontrolu
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    logging.info(f"Device: {device}")
    
    if torch.cuda.is_available():
        logging.info(f"GPU: {torch.cuda.get_device_name(0)}")
        logging.info(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")
    
    # Manifest yukle
    manifest_path = 'data/phase1_manifest.csv'
    if not Path(manifest_path).exists():
        logging.error(f"Manifest bulunamadi: {manifest_path}")
        return
    
    # Tum veri seti ile egitim (376,775 dosya)
    logging.info("Tum veri seti ile egitim baslatiliyor...")
    dataset = TIFDataset(manifest_path, transform=get_transforms(), max_samples=None)
    
    # DataLoader
    batch_size = 4  # MX450 icin kucuk batch
    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True, num_workers=2)
    
    # Model
    model = SimCLRModel().to(device)
    criterion = SimCLRLoss(temperature=0.1)
    optimizer = optim.Adam(model.parameters(), lr=1e-3, weight_decay=1e-4)
    
    # Egitim
    epochs = 5  # Tam veri seti ile 5 epoch
    logging.info(f"Egitim baslatiliyor: {epochs} epoch, batch_size={batch_size}")
    logging.info(f"Toplam dosya: {len(dataset)}, Toplam batch: {len(dataloader)}")
    
    start_time = time.time()
    
    for epoch in range(epochs):
        model.train()
        total_loss = 0
        num_batches = 0
        
        for batch_idx, (images, _) in enumerate(dataloader):
            images = images.to(device)
            
            # SimCLR icin iki augmented view
            aug1 = images
            # Tensor'i PIL'e cevir, sonra tekrar transform et
            aug2_images = []
            for img in images.cpu():
                # Tensor'i PIL Image'a cevir
                img_np = img.permute(1, 2, 0).numpy()
                img_np = (img_np * 255).astype(np.uint8)
                pil_img = Image.fromarray(img_np)
                # Transform uygula
                aug2_img = get_transforms()(pil_img)
                aug2_images.append(aug2_img)
            aug2 = torch.stack(aug2_images).to(device)
            
            # Forward pass
            _, z1 = model(aug1)
            _, z2 = model(aug2)
            
            # Loss
            loss = criterion(z1, z2)
            
            # Backward pass
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            
            total_loss += loss.item()
            num_batches += 1
            
            if batch_idx % 100 == 0:  # Daha az log (376K dosya için)
                logging.info(f"Epoch {epoch+1}/{epochs}, Batch {batch_idx}/{len(dataloader)}, Loss: {loss.item():.4f}")
        
        avg_loss = total_loss / num_batches
        epoch_time = time.time() - start_time
        logging.info(f"Epoch {epoch+1} tamamlandi - Avg Loss: {avg_loss:.4f}, Sure: {epoch_time:.1f}s")
    
    total_time = time.time() - start_time
    logging.info(f"Toplam egitim suresi: {total_time:.1f} saniye")
    
    # Model kaydet - Water Quality sayfası için
    model_path = 'models/water_quality_phase1_model.pth'
    Path('models').mkdir(exist_ok=True)
    torch.save({
        'model_state_dict': model.state_dict(),
        'optimizer_state_dict': optimizer.state_dict(),
        'epoch': epochs,
        'loss': avg_loss,
        'training_time': total_time,
        'model_type': 'water_quality_self_supervised',
        'phase': 1,
        'description': 'Self-supervised pre-training for water quality analysis'
    }, model_path)
    
    logging.info(f"Water Quality model kaydedildi: {model_path}")
    
    # Water Quality sayfası için özet rapor
    summary = {
        'model_name': 'Water Quality Phase 1 Model',
        'model_type': 'Self-Supervised Pre-training',
        'total_files': len(dataset),
        'epochs': epochs,
        'batch_size': batch_size,
        'total_time_seconds': total_time,
        'avg_epoch_time': total_time / epochs,
        'final_loss': avg_loss,
        'device': str(device),
        'model_path': model_path,
        'water_quality_ready': True,
        'next_phase': 'Supervised Fine-tuning',
        'created_at': datetime.now().isoformat()
    }
    
    with open('data/water_quality_phase1_summary.json', 'w') as f:
        json.dump(summary, f, indent=2)
    
    logging.info("=" * 60)
    logging.info("WATER QUALITY PHASE 1 TAMAMLANDI!")
    logging.info(f"Toplam sure: {total_time:.1f} saniye")
    logging.info(f"Ortalama epoch suresi: {total_time/epochs:.1f} saniye")
    logging.info(f"Water Quality Model: {model_path}")
    logging.info("Water Quality sayfası için hazır!")
    logging.info("=" * 60)
    
    return summary

if __name__ == "__main__":
    train_phase1()
