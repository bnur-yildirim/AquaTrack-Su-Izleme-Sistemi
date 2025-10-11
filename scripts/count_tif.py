#!/usr/bin/env python3
import os

def count_tif_files():
    total = 0
    for root, dirs, files in os.walk('data'):
        total += len([f for f in files if f.endswith('.tif')])
    print(f'Toplam TIF dosyasi: {total}')

if __name__ == "__main__":
    count_tif_files()
