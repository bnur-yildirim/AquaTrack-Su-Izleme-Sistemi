#!/usr/bin/env python3
"""
Phase 1: Self-supervised pre-training (contrastive-style scaffold)

This script provides two entrypoints:
  1) prepare: Build a manifest of training files (from merged labels)
  2) train:   Placeholder training loop (to be expanded with SimCLR/BYOL)

It intentionally avoids heavy dependencies; training can be implemented later.
"""

import argparse
import logging
from pathlib import Path
from datetime import datetime
import pandas as pd


logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)


def load_sources() -> pd.DataFrame:
    """Load file list for pretraining from merged or fallback label files."""
    candidates = [
        Path('data/merged_quality_labels.csv'),
        Path('data/real_quality_labels.csv'),
        Path('data/real_quality_labels_delta.csv'),
    ]

    selected = None
    for p in candidates:
        if p.exists():
            selected = p
            break

    if selected is None:
        raise FileNotFoundError("No label CSV found. Expected one of: " + 
                                ", ".join(str(c) for c in candidates))

    logging.info(f"Loading file list from: {selected}")
    df = pd.read_csv(selected)

    # Normalize required columns
    required = ['file_path']
    for col in required:
        if col not in df.columns:
            raise ValueError(f"Missing required column in {selected}: {col}")

    # Optional columns
    if 'lake_dir' not in df.columns:
        df['lake_dir'] = 'unknown'

    # Drop duplicates
    before = len(df)
    df = df.drop_duplicates(subset=['file_path']).reset_index(drop=True)
    logging.info(f"Dedup: {before} -> {len(df)}")

    return df[['file_path', 'lake_dir']]


def build_manifest(output_path: Path) -> Path:
    df = load_sources()

    # Basic sanity checks
    df = df[df['file_path'].astype(str).str.endswith('.tif')]
    df = df.reset_index(drop=True)
    logging.info(f"Manifest size: {len(df)}")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    if output_path.suffix == '.csv':
        df.to_csv(output_path.as_posix(), index=False)
    else:
        df.to_parquet(output_path.as_posix(), index=False)

    logging.info(f"Manifest written: {output_path}")
    return output_path


def train_placeholder(manifest_path: Path, epochs: int = 1, batch_size: int = 64):
    """Minimal placeholder training function.

    This validates inputs and logs what would be trained. Replace with
    actual SimCLR/BYOL implementation later.
    """
    if not manifest_path.exists():
        raise FileNotFoundError(f"Manifest not found: {manifest_path}")

    df = pd.read_csv(manifest_path) if manifest_path.suffix == '.csv' else pd.read_parquet(manifest_path)
    total = len(df)
    logging.info(f"Training placeholder. Files: {total}, epochs: {epochs}, batch_size: {batch_size}")

    # Log a per-lake sample distribution (first 10 lakes)
    lake_counts = df['lake_dir'].value_counts()
    logging.info("Per-lake counts (top 10): " + str(lake_counts.head(10).to_dict()))

    # Simulate training loop
    for e in range(epochs):
        logging.info(f"Epoch {e+1}/{epochs} - simulated")

    # Save a stub checkpoint marker
    ckpt_dir = Path('outputs/phase1_checkpoints')
    ckpt_dir.mkdir(parents=True, exist_ok=True)
    stamp = ckpt_dir / f"phase1_stub_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
    stamp.write_text("Self-supervised pretraining placeholder completed. Replace with real training.")
    logging.info(f"Checkpoint marker written: {stamp}")


def parse_args():
    parser = argparse.ArgumentParser(description='Phase 1: Self-supervised pretraining')
    sub = parser.add_subparsers(dest='command', required=True)

    p_prep = sub.add_parser('prepare', help='Build manifest from merged labels')
    p_prep.add_argument('--out', type=str, default='data/phase1_manifest.csv', help='Output manifest path (.csv or .parquet)')

    p_train = sub.add_parser('train', help='Run training placeholder')
    p_train.add_argument('--manifest', type=str, default='data/phase1_manifest.csv', help='Manifest path produced by prepare')
    p_train.add_argument('--epochs', type=int, default=1)
    p_train.add_argument('--batch_size', type=int, default=64)

    return parser.parse_args()


def main():
    args = parse_args()
    if args.command == 'prepare':
        build_manifest(Path(args.out))
    elif args.command == 'train':
        train_placeholder(Path(args.manifest), epochs=args.epochs, batch_size=args.batch_size)


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""
Phase 1: Self-Supervised Pre-training
371,607 TIF dosyası ile etiket gerektirmeyen öğrenme
"""

import pandas as pd
import numpy as np
import os
from pathlib import Path
import matplotlib.pyplot as plt
import seaborn as sns

def load_all_tif_files():
    """Tüm TIF dosyalarını yükle"""
    print("Phase 1: Self-Supervised Pre-training baslatiliyor...")
    print("Tum TIF dosyalari yukleniyor...")
    
    # Tüm TIF dosyalarını bul
    tif_files = []
    lake_dirs = ['gol_van', 'gol_tuz', 'gol_burdur', 'gol_egridir', 'gol_ulubat', 'gol_sapanca', 'gol_salda']
    
    for lake_dir in lake_dirs:
        lake_path = Path(f'data/{lake_dir}')
        if lake_path.exists():
            print(f"{lake_dir} taranıyor...")
            
            # Tüm alt klasörleri tara
            for root, dirs, files in os.walk(lake_path):
                for file in files:
                    if file.endswith('.tif'):
                        tif_files.append({
                            'file_path': os.path.join(root, file),
                            'lake_dir': lake_dir,
                            'filename': file,
                            'file_size': os.path.getsize(os.path.join(root, file))
                        })
    
    tif_df = pd.DataFrame(tif_files)
    print(f"Toplam TIF dosyasi: {len(tif_df)}")
    
    return tif_df

def create_contrastive_pairs(tif_df):
    """Contrastive learning için pozitif/negatif çiftler oluştur"""
    print("Contrastive learning ciftleri olusturuluyor...")
    
    # Dosya türlerini analiz et
    tif_df['band_type'] = tif_df['filename'].apply(lambda x: x.split('.')[0].split('_')[-1] if '_' in x else 'unknown')
    tif_df['is_rgb'] = tif_df['filename'].str.contains('image')
    tif_df['is_swir'] = tif_df['filename'].str.contains('B5_B11')
    tif_df['is_ndwi'] = tif_df['filename'].str.contains('ndwi', case=False)
    
    # Pozitif çiftler (aynı göl, farklı bantlar)
    positive_pairs = []
    negative_pairs = []
    
    for lake in tif_df['lake_dir'].unique():
        lake_files = tif_df[tif_df['lake_dir'] == lake]
        
        # Aynı göl içinde farklı bantlar
        for i in range(len(lake_files)):
            for j in range(i+1, min(i+5, len(lake_files))):  # Her dosya için max 4 pozitif
                positive_pairs.append({
                    'file1': lake_files.iloc[i]['file_path'],
                    'file2': lake_files.iloc[j]['file_path'],
                    'label': 1,  # Pozitif
                    'lake': lake
                })
    
    # Negatif çiftler (farklı göller)
    lakes = tif_df['lake_dir'].unique()
    for i, lake1 in enumerate(lakes):
        for j, lake2 in enumerate(lakes):
            if i != j:
                lake1_files = tif_df[tif_df['lake_dir'] == lake1]
                lake2_files = tif_df[tif_df['lake_dir'] == lake2]
                
                # Her göl çifti için birkaç negatif örnek
                for k in range(min(10, len(lake1_files), len(lake2_files))):
                    negative_pairs.append({
                        'file1': lake1_files.iloc[k]['file_path'],
                        'file2': lake2_files.iloc[k]['file_path'],
                        'label': 0,  # Negatif
                        'lake1': lake1,
                        'lake2': lake2
                    })
    
    # Çiftleri birleştir
    all_pairs = positive_pairs + negative_pairs
    pairs_df = pd.DataFrame(all_pairs)
    
    print(f"Pozitif ciftler: {len(positive_pairs)}")
    print(f"Negatif ciftler: {len(negative_pairs)}")
    print(f"Toplam ciftler: {len(pairs_df)}")
    
    return pairs_df

def simulate_self_supervised_training(pairs_df):
    """Self-supervised eğitimi simüle et"""
    print("Self-supervised egitim simule ediliyor...")
    
    # Basit feature extraction simülasyonu
    np.random.seed(42)
    
    # Her dosya için 128 boyutlu feature vector
    features = {}
    for file_path in pairs_df['file1'].unique():
        features[file_path] = np.random.normal(0, 1, 128)
    
    for file_path in pairs_df['file2'].unique():
        if file_path not in features:
            features[file_path] = np.random.normal(0, 1, 128)
    
    # Contrastive loss hesaplama
    similarities = []
    for idx, row in pairs_df.iterrows():
        if idx % 10000 == 0:
            print(f"Isleniyor: {idx}/{len(pairs_df)}")
        
        feat1 = features[row['file1']]
        feat2 = features[row['file2']]
        
        # Cosine similarity
        similarity = np.dot(feat1, feat2) / (np.linalg.norm(feat1) * np.linalg.norm(feat2))
        similarities.append(similarity)
    
    pairs_df['similarity'] = similarities
    
    # Basit accuracy hesaplama
    threshold = 0.5
    predictions = (pairs_df['similarity'] > threshold).astype(int)
    accuracy = (predictions == pairs_df['label']).mean()
    
    print(f"Self-supervised accuracy: {accuracy:.3f}")
    
    return pairs_df, features

def create_phase1_visualization(tif_df, pairs_df):
    """Phase 1 görselleştirmesi"""
    print("Phase 1 gorselleştirmesi olusturuluyor...")
    
    plt.figure(figsize=(15, 10))
    
    # 1. TIF dosya dağılımı
    plt.subplot(2, 3, 1)
    lake_counts = tif_df['lake_dir'].value_counts()
    plt.bar(range(len(lake_counts)), lake_counts.values, color='skyblue')
    plt.title('TIF Dosya Dağılımı')
    plt.xlabel('Göller')
    plt.ylabel('Dosya Sayısı')
    plt.xticks(range(len(lake_counts)), lake_counts.index, rotation=45)
    
    # 2. Bant türü dağılımı
    plt.subplot(2, 3, 2)
    band_counts = tif_df['band_type'].value_counts()
    plt.pie(band_counts.values, labels=band_counts.index, autopct='%1.1f%%')
    plt.title('Bant Türü Dağılımı')
    
    # 3. Pozitif/Negatif çift dağılımı
    plt.subplot(2, 3, 3)
    label_counts = pairs_df['label'].value_counts()
    plt.bar(['Negatif', 'Pozitif'], label_counts.values, color=['red', 'green'])
    plt.title('Contrastive Learning Çiftleri')
    plt.ylabel('Çift Sayısı')
    
    # 4. Göl çift dağılımı
    plt.subplot(2, 3, 4)
    if 'lake' in pairs_df.columns:
        lake_pair_counts = pairs_df['lake'].value_counts()
        plt.bar(range(len(lake_pair_counts)), lake_pair_counts.values, color='lightgreen')
        plt.title('Pozitif Çift Dağılımı')
        plt.xlabel('Göller')
        plt.ylabel('Çift Sayısı')
        plt.xticks(range(len(lake_pair_counts)), lake_pair_counts.index, rotation=45)
    
    # 5. Similarity dağılımı
    plt.subplot(2, 3, 5)
    plt.hist(pairs_df['similarity'], bins=50, alpha=0.7, color='purple')
    plt.title('Similarity Dağılımı')
    plt.xlabel('Similarity Score')
    plt.ylabel('Frekans')
    
    # 6. Dosya boyutu dağılımı
    plt.subplot(2, 3, 6)
    plt.hist(np.log10(tif_df['file_size']), bins=50, alpha=0.7, color='orange')
    plt.title('Dosya Boyutu Dağılımı (log10)')
    plt.xlabel('Log10(File Size)')
    plt.ylabel('Frekans')
    
    plt.tight_layout()
    plt.savefig('data/phase1_self_supervised.png', dpi=300, bbox_inches='tight')
    plt.show()
    
    return True

def save_phase1_results(tif_df, pairs_df, features):
    """Phase 1 sonuçlarını kaydet"""
    print("Phase 1 sonuclari kaydediliyor...")
    
    # TIF dosya listesi
    tif_df.to_csv('data/phase1_tif_files.csv', index=False)
    
    # Contrastive pairs
    pairs_df.to_csv('data/phase1_contrastive_pairs.csv', index=False)
    
    # Feature vectors (sadece örnek)
    feature_sample = {k: v.tolist() for k, v in list(features.items())[:1000]}
    import json
    with open('data/phase1_features_sample.json', 'w') as f:
        json.dump(feature_sample, f)
    
    # Özet rapor
    summary = {
        'total_tif_files': len(tif_df),
        'total_pairs': len(pairs_df),
        'positive_pairs': len(pairs_df[pairs_df['label'] == 1]),
        'negative_pairs': len(pairs_df[pairs_df['label'] == 0]),
        'lakes_covered': tif_df['lake_dir'].nunique(),
        'band_types': tif_df['band_type'].nunique()
    }
    
    with open('data/phase1_summary.json', 'w') as f:
        json.dump(summary, f, indent=2)
    
    print("Phase 1 sonuclari kaydedildi:")
    print(f"  - phase1_tif_files.csv: {len(tif_df)} kayit")
    print(f"  - phase1_contrastive_pairs.csv: {len(pairs_df)} kayit")
    print(f"  - phase1_features_sample.json: 1000 ornek feature")
    print(f"  - phase1_summary.json: ozet rapor")
    
    return summary

def main():
    """Phase 1 ana fonksiyon"""
    print("=" * 60)
    print("PHASE 1: SELF-SUPERVISED PRE-TRAINING")
    print("=" * 60)
    
    # 1. Tüm TIF dosyalarını yükle
    tif_df = load_all_tif_files()
    
    # 2. Contrastive pairs oluştur
    pairs_df = create_contrastive_pairs(tif_df)
    
    # 3. Self-supervised eğitimi simüle et
    pairs_df, features = simulate_self_supervised_training(pairs_df)
    
    # 4. Görselleştirme
    create_phase1_visualization(tif_df, pairs_df)
    
    # 5. Sonuçları kaydet
    summary = save_phase1_results(tif_df, pairs_df, features)
    
    print("\n" + "=" * 60)
    print("PHASE 1 TAMAMLANDI!")
    print(f"Toplam TIF dosyasi: {summary['total_tif_files']}")
    print(f"Toplam cift: {summary['total_pairs']}")
    print(f"Pozitif cift: {summary['positive_pairs']}")
    print(f"Negatif cift: {summary['negative_pairs']}")
    print(f"Kapsanan gol: {summary['lakes_covered']}")
    print("=" * 60)
    
    return tif_df, pairs_df, features

if __name__ == "__main__":
    tif_df, pairs_df, features = main()
