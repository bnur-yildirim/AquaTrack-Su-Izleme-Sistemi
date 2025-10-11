#!/usr/bin/env python3
"""
Eğirdir Gölü B5/B11 Feature Extraction
Ham TIF dosyalarından su kalitesi özelliklerini çıkar
"""

import os
import glob
import numpy as np
import pandas as pd
import rasterio
from datetime import datetime
from scipy.stats import skew, kurtosis
import warnings
warnings.filterwarnings('ignore')

# Eğirdir Lake ID
LAKE_ID = 1340
LAKE_NAME = "Eğirdir Gölü"
DATA_DIR = "data/gol_egridir"
OUTPUT_FILE = "data/water_quality/egirdir_b5_b11_features.csv"

def load_band_tiles(date_str, band_name, year):
    """Load all tiles for a specific band and date"""
    pattern = os.path.join(DATA_DIR, str(year), "images", f"{date_str}_tile*_B5_B11.{band_name}.tif")
    files = sorted(glob.glob(pattern))
    
    if not files:
        # Try with image pattern for B2/B3/B4/B8
        pattern = os.path.join(DATA_DIR, str(year), "images", f"{date_str}_tile*_image.{band_name}.tif")
        files = sorted(glob.glob(pattern))
    
    return files

def load_ndwi_mask_tiles(date_str, year):
    """Load NDWI mask tiles"""
    pattern = os.path.join(DATA_DIR, str(year), "ndwi_masks", f"{date_str}_tile*_mask.tif")
    return sorted(glob.glob(pattern))

def read_and_merge_tiles(tile_files):
    """Read and merge multiple tiles into one array"""
    if not tile_files:
        return None
    
    all_data = []
    for tile_file in tile_files:
        try:
            with rasterio.open(tile_file) as src:
                data = src.read(1).astype(np.float32)
                # Replace nodata with NaN
                if src.nodata is not None:
                    data[data == src.nodata] = np.nan
                all_data.append(data.flatten())
        except Exception as e:
            print(f"  Warning: Could not read {tile_file}: {e}")
            continue
    
    if not all_data:
        return None
    
    # Concatenate all tile data
    merged = np.concatenate(all_data)
    return merged

def calculate_band_stats(data):
    """Calculate statistics for a band"""
    if data is None or len(data) == 0:
        return {
            'mean': np.nan, 'std': np.nan, 'min': np.nan, 'max': np.nan,
            'p25': np.nan, 'p50': np.nan, 'p75': np.nan,
            'skew': np.nan, 'kurtosis': np.nan
        }
    
    # Remove NaN and inf values
    valid_data = data[np.isfinite(data)]
    
    if len(valid_data) == 0:
        return {
            'mean': np.nan, 'std': np.nan, 'min': np.nan, 'max': np.nan,
            'p25': np.nan, 'p50': np.nan, 'p75': np.nan,
            'skew': np.nan, 'kurtosis': np.nan
        }
    
    return {
        'mean': float(np.mean(valid_data)),
        'std': float(np.std(valid_data)),
        'min': float(np.min(valid_data)),
        'max': float(np.max(valid_data)),
        'p25': float(np.percentile(valid_data, 25)),
        'p50': float(np.percentile(valid_data, 50)),
        'p75': float(np.percentile(valid_data, 75)),
        'skew': float(skew(valid_data)) if len(valid_data) > 2 else np.nan,
        'kurtosis': float(kurtosis(valid_data)) if len(valid_data) > 2 else np.nan
    }

def calculate_water_quality_indices(b5, b11, ndwi):
    """Calculate WRI, Chl-a, and Turbidity"""
    results = {}
    
    # WRI (Water Ratio Index) = B5 / B11
    if b5 is not None and b11 is not None:
        b5_valid = b5[np.isfinite(b5) & (b5 > 0)]
        b11_valid = b11[np.isfinite(b11) & (b11 > 0)]
        
        if len(b5_valid) > 0 and len(b11_valid) > 0:
            # Calculate WRI for all pixels
            wri_data = []
            for i in range(min(len(b5), len(b11))):
                if np.isfinite(b5[i]) and np.isfinite(b11[i]) and b11[i] > 0:
                    wri_data.append(b5[i] / b11[i])
            
            if wri_data:
                wri_stats = calculate_band_stats(np.array(wri_data))
                results['wri_mean'] = wri_stats['mean']
                results['wri_std'] = wri_stats['std']
                results['wri_min'] = wri_stats['min']
                results['wri_max'] = wri_stats['max']
            else:
                results.update({'wri_mean': np.nan, 'wri_std': np.nan, 'wri_min': np.nan, 'wri_max': np.nan})
        else:
            results.update({'wri_mean': np.nan, 'wri_std': np.nan, 'wri_min': np.nan, 'wri_max': np.nan})
    else:
        results.update({'wri_mean': np.nan, 'wri_std': np.nan, 'wri_min': np.nan, 'wri_max': np.nan})
    
    # Chlorophyll-a (simplified from B5)
    if b5 is not None:
        b5_valid = b5[np.isfinite(b5)]
        if len(b5_valid) > 0:
            # Simplified Chl-a estimation: proportional to B5
            chl_a = b5_valid * 0.01  # Scaling factor
            chl_stats = calculate_band_stats(chl_a)
            results['chl_a_mean'] = chl_stats['mean']
            results['chl_a_std'] = chl_stats['std']
            results['chl_a_min'] = chl_stats['min']
            results['chl_a_max'] = chl_stats['max']
        else:
            results.update({'chl_a_mean': np.nan, 'chl_a_std': np.nan, 'chl_a_min': np.nan, 'chl_a_max': np.nan})
    else:
        results.update({'chl_a_mean': np.nan, 'chl_a_std': np.nan, 'chl_a_min': np.nan, 'chl_a_max': np.nan})
    
    # Turbidity (from B11)
    if b11 is not None:
        b11_valid = b11[np.isfinite(b11)]
        if len(b11_valid) > 0:
            # Turbidity proportional to B11
            turbidity = b11_valid * 0.0001  # Scaling factor
            turb_stats = calculate_band_stats(turbidity)
            results['turbidity_mean'] = turb_stats['mean']
            results['turbidity_std'] = turb_stats['std']
            results['turbidity_min'] = turb_stats['min']
            results['turbidity_max'] = turb_stats['max']
        else:
            results.update({'turbidity_mean': np.nan, 'turbidity_std': np.nan, 'turbidity_min': np.nan, 'turbidity_max': np.nan})
    else:
        results.update({'turbidity_mean': np.nan, 'turbidity_std': np.nan, 'turbidity_min': np.nan, 'turbidity_max': np.nan})
    
    # Water pixels count (from NDWI mask)
    if ndwi is not None:
        water_pixels = int(np.sum(ndwi > 0))
        total_pixels = int(len(ndwi))
        water_ratio = water_pixels / total_pixels if total_pixels > 0 else 0.0
        results['water_pixels'] = water_pixels
        results['total_pixels'] = total_pixels
        results['water_ratio'] = water_ratio
    else:
        results.update({'water_pixels': 0, 'total_pixels': 0, 'water_ratio': 0.0})
    
    return results

def process_date(date_str, year):
    """Process a single date"""
    print(f"  Processing {date_str}...")
    
    # Load B5 tiles
    b5_files = load_band_tiles(date_str, "B5", year)
    b5_data = read_and_merge_tiles(b5_files)
    
    # Load B11 tiles  
    b11_files = load_band_tiles(date_str, "B11", year)
    b11_data = read_and_merge_tiles(b11_files)
    
    # Load NDWI mask
    ndwi_files = load_ndwi_mask_tiles(date_str, year)
    ndwi_data = read_and_merge_tiles(ndwi_files)
    
    if b5_data is None and b11_data is None:
        print(f"    No data for {date_str}")
        return None
    
    # Calculate statistics
    b5_stats = calculate_band_stats(b5_data)
    b11_stats = calculate_band_stats(b11_data)
    ndwi_stats = calculate_band_stats(ndwi_data)
    
    # Calculate water quality indices
    wq_indices = calculate_water_quality_indices(b5_data, b11_data, ndwi_data)
    
    # Parse date
    date_obj = datetime.strptime(date_str, "%Y%m%d")
    
    # Combine all metrics
    record = {
        'lake_id': LAKE_ID,
        'lake_name': LAKE_NAME,
        'date': date_obj.strftime('%Y-%m-%d'),
        'year': date_obj.year,
        'month': date_obj.month,
        'day': date_obj.day,
        'b5_mean': b5_stats['mean'],
        'b5_std': b5_stats['std'],
        'b5_min': b5_stats['min'],
        'b5_max': b5_stats['max'],
        'b5_p25': b5_stats['p25'],
        'b5_p50': b5_stats['p50'],
        'b5_p75': b5_stats['p75'],
        'b5_skew': b5_stats['skew'],
        'b5_kurtosis': b5_stats['kurtosis'],
        'b11_mean': b11_stats['mean'],
        'b11_std': b11_stats['std'],
        'b11_min': b11_stats['min'],
        'b11_max': b11_stats['max'],
        'b11_p25': b11_stats['p25'],
        'b11_p50': b11_stats['p50'],
        'b11_p75': b11_stats['p75'],
        'b11_skew': b11_stats['skew'],
        'b11_kurtosis': b11_stats['kurtosis'],
        'ndwi_mean': ndwi_stats['mean'],
        'ndwi_std': ndwi_stats['std'],
        'ndwi_min': ndwi_stats['min'],
        'ndwi_max': ndwi_stats['max'],
        'ndwi_p25': ndwi_stats['p25'],
        'ndwi_p50': ndwi_stats['p50'],
        'ndwi_p75': ndwi_stats['p75'],
        'ndwi_skew': ndwi_stats['skew'],
        'ndwi_kurtosis': ndwi_stats['kurtosis']
    }
    
    # Add water quality indices
    record.update(wq_indices)
    
    return record

def main():
    print("=" * 80)
    print(f"EĞIRDIR GÖLÜ B5/B11 FEATURE EXTRACTION")
    print("=" * 80)
    print(f"Lake ID: {LAKE_ID}")
    print(f"Lake Name: {LAKE_NAME}")
    print(f"Data Directory: {DATA_DIR}")
    print()
    
    # Find all unique dates across all years
    all_records = []
    
    for year in range(2018, 2025):
        year_dir = os.path.join(DATA_DIR, str(year), "images")
        if not os.path.exists(year_dir):
            continue
        
        print(f"\n📅 Processing year {year}...")
        
        # Find all B5 files to get dates
        pattern = os.path.join(year_dir, "*_tile*_B5_B11.B5.tif")
        files = glob.glob(pattern)
        
        # Extract unique dates
        dates = set()
        for f in files:
            basename = os.path.basename(f)
            date_str = basename.split('_')[0]
            dates.add(date_str)
        
        dates = sorted(dates)
        print(f"  Found {len(dates)} dates")
        
        # Process each date
        for date_str in dates:
            record = process_date(date_str, year)
            if record:
                all_records.append(record)
    
    print(f"\n✅ Total records processed: {len(all_records)}")
    
    if not all_records:
        print("❌ No data found!")
        return
    
    # Create DataFrame
    df = pd.DataFrame(all_records)
    df = df.sort_values('date').reset_index(drop=True)
    
    # Save to CSV
    df.to_csv(OUTPUT_FILE, index=False)
    print(f"\n💾 Saved to: {OUTPUT_FILE}")
    
    # Show summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"Total records: {len(df)}")
    print(f"Date range: {df['date'].min()} to {df['date'].max()}")
    print(f"\nSample statistics:")
    print(f"  NDWI mean: {df['ndwi_mean'].mean():.2f} ± {df['ndwi_mean'].std():.2f}")
    print(f"  WRI mean: {df['wri_mean'].mean():.2f} ± {df['wri_mean'].std():.2f}")
    print(f"  Chl-a mean: {df['chl_a_mean'].mean():.2f} ± {df['chl_a_mean'].std():.2f}")
    print(f"  Turbidity mean: {df['turbidity_mean'].mean():.2f} ± {df['turbidity_mean'].std():.2f}")
    print()

if __name__ == "__main__":
    main()

