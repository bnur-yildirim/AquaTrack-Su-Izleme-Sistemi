#!/usr/bin/env python3
"""
3 Fazlı Yaklaşımı Çalıştırma
Phase 1: Self-Supervised Pre-training
Phase 2: Supervised Fine-tuning  
Phase 3: Ensemble Methods
"""

import subprocess
import sys
import time
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

def run_phase(phase_script, phase_name):
    """Bir fazı çalıştır"""
    print(f"\n{'='*60}")
    print(f"{phase_name} BAŞLATILIYOR...")
    print(f"{'='*60}")
    
    start_time = time.time()
    
    try:
        result = subprocess.run([sys.executable, phase_script], 
                              capture_output=True, text=True, timeout=300)
        
        end_time = time.time()
        duration = end_time - start_time
        
        if result.returncode == 0:
            print(f"✅ {phase_name} BAŞARILI!")
            print(f"⏱️ Süre: {duration:.2f} saniye")
            return True, duration
        else:
            print(f"❌ {phase_name} HATALI!")
            print(f"Hata: {result.stderr}")
            return False, duration
            
    except subprocess.TimeoutExpired:
        print(f"⏰ {phase_name} ZAMAN AŞIMI!")
        return False, 300
    except Exception as e:
        print(f"💥 {phase_name} HATA: {e}")
        return False, 0

def create_final_comparison():
    """Final karşılaştırma grafiği"""
    print("\nFinal karşılaştırma grafiği oluşturuluyor...")
    
    try:
        # Phase sonuçlarını yükle
        phase1_summary = pd.read_json('data/phase1_summary.json')
        phase2_summary = pd.read_json('data/phase2_summary.json')
        phase3_summary = pd.read_json('data/phase3_summary.json')
        
        # Phase 2 model performansları
        phase2_performance = pd.read_csv('data/phase2_model_performance.csv')
        
        # Phase 3 ensemble performansları
        phase3_performance = pd.read_csv('data/phase3_ensemble_performance.csv')
        
        # Final karşılaştırma grafiği
        plt.figure(figsize=(20, 12))
        
        # 1. Phase 2 vs Phase 3 model karşılaştırması
        plt.subplot(3, 4, 1)
        phase2_models = phase2_performance['model'].tolist()
        phase2_accuracies = phase2_performance['accuracy'].tolist()
        
        phase3_models = phase3_performance['model'].tolist()
        phase3_accuracies = phase3_performance['accuracy'].tolist()
        
        x = np.arange(len(phase2_models))
        width = 0.35
        
        plt.bar(x - width/2, phase2_accuracies, width, label='Phase 2 (Single)', alpha=0.8)
        plt.bar(x + width/2, phase3_accuracies[:len(phase2_models)], width, label='Phase 3 (Ensemble)', alpha=0.8)
        
        plt.title('Phase 2 vs Phase 3 Model Performance')
        plt.xlabel('Modeller')
        plt.ylabel('Accuracy')
        plt.xticks(x, phase2_models, rotation=45)
        plt.legend()
        
        # 2. Best model comparison
        plt.subplot(3, 4, 2)
        best_phase2 = phase2_performance.loc[phase2_performance['accuracy'].idxmax()]
        best_phase3 = phase3_performance.loc[phase3_performance['accuracy'].idxmax()]
        
        phases = ['Phase 2', 'Phase 3']
        best_accuracies = [best_phase2['accuracy'], best_phase3['accuracy']]
        best_models = [best_phase2['model'], best_phase3['model']]
        
        plt.bar(phases, best_accuracies, color=['skyblue', 'lightgreen'])
        plt.title('En İyi Model Karşılaştırması')
        plt.ylabel('Accuracy')
        
        for i, (phase, acc, model) in enumerate(zip(phases, best_accuracies, best_models)):
            plt.text(i, acc + 0.01, f'{model}\n{acc:.3f}', ha='center', va='bottom')
        
        # 3. Phase 3 ensemble vs single models
        plt.subplot(3, 4, 3)
        ensemble_models = ['Voting Classifier', 'Bagging RF', 'Weighted Voting']
        single_models = ['Random Forest', 'SVM', 'Logistic Regression']
        
        ensemble_acc = [phase3_performance[phase3_performance['model'] == model]['accuracy'].iloc[0] 
                       for model in ensemble_models if model in phase3_performance['model'].values]
        single_acc = [phase3_performance[phase3_performance['model'] == model]['accuracy'].iloc[0] 
                      for model in single_models if model in phase3_performance['model'].values]
        
        x = np.arange(len(ensemble_models))
        width = 0.35
        
        plt.bar(x - width/2, ensemble_acc, width, label='Ensemble', alpha=0.8)
        plt.bar(x + width/2, single_acc, width, label='Single', alpha=0.8)
        
        plt.title('Ensemble vs Single Models')
        plt.xlabel('Model Types')
        plt.ylabel('Accuracy')
        plt.xticks(x, ensemble_models, rotation=45)
        plt.legend()
        
        # 4. Phase progression
        plt.subplot(3, 4, 4)
        phases = ['Phase 1\n(Self-Supervised)', 'Phase 2\n(Supervised)', 'Phase 3\n(Ensemble)']
        phase_accuracies = [0.5, best_phase2['accuracy'], best_phase3['accuracy']]  # Phase 1 için varsayılan
        
        plt.plot(phases, phase_accuracies, 'o-', linewidth=2, markersize=8)
        plt.title('Phase Progression')
        plt.ylabel('Best Accuracy')
        plt.xticks(rotation=45)
        
        # 5. Model stability (CV std)
        plt.subplot(3, 4, 5)
        cv_stds = phase3_performance['cv_std'].tolist()
        models = phase3_performance['model'].tolist()
        
        plt.bar(models, cv_stds, color='lightcoral', alpha=0.7)
        plt.title('Model Stability (CV Std)')
        plt.xlabel('Modeller')
        plt.ylabel('CV Standard Deviation')
        plt.xticks(rotation=45)
        
        # 6. Accuracy distribution
        plt.subplot(3, 4, 6)
        all_accuracies = phase3_performance['accuracy'].tolist()
        plt.hist(all_accuracies, bins=10, alpha=0.7, color='purple')
        plt.title('Accuracy Distribution')
        plt.xlabel('Accuracy')
        plt.ylabel('Frequency')
        
        # 7. Phase 1 data overview
        plt.subplot(3, 4, 7)
        phase1_data = [phase1_summary['total_tif_files'], phase1_summary['total_pairs']]
        phase1_labels = ['TIF Files', 'Contrastive Pairs']
        
        plt.bar(phase1_labels, phase1_data, color=['skyblue', 'lightgreen'])
        plt.title('Phase 1 Data Overview')
        plt.ylabel('Count')
        
        # 8. Phase 2 data overview
        plt.subplot(3, 4, 8)
        phase2_data = [phase2_summary['total_samples'], phase2_summary['lakes']]
        phase2_labels = ['Total Samples', 'Lakes']
        
        plt.bar(phase2_labels, phase2_data, color=['skyblue', 'lightgreen'])
        plt.title('Phase 2 Data Overview')
        plt.ylabel('Count')
        
        # 9. Phase 3 data overview
        plt.subplot(3, 4, 9)
        phase3_data = [phase3_summary['total_models'], len(phase3_summary['ensemble_models'])]
        phase3_labels = ['Total Models', 'Ensemble Models']
        
        plt.bar(phase3_labels, phase3_data, color=['skyblue', 'lightgreen'])
        plt.title('Phase 3 Data Overview')
        plt.ylabel('Count')
        
        # 10. Performance heatmap
        plt.subplot(3, 4, 10)
        performance_matrix = phase3_performance[['model', 'accuracy', 'cv_mean']].set_index('model')
        sns.heatmap(performance_matrix.T, annot=True, fmt='.3f', cmap='YlOrRd')
        plt.title('Performance Heatmap')
        
        # 11. Model ranking
        plt.subplot(3, 4, 11)
        ranked_models = phase3_performance.sort_values('accuracy', ascending=True)
        plt.barh(ranked_models['model'], ranked_models['accuracy'], color='gold', alpha=0.7)
        plt.title('Model Ranking')
        plt.xlabel('Accuracy')
        
        # 12. Final summary
        plt.subplot(3, 4, 12)
        final_summary = {
            'Best Model': phase3_summary['best_model'],
            'Best Accuracy': f"{phase3_summary['best_accuracy']:.3f}",
            'Total Models': phase3_summary['total_models'],
            'Ensemble Models': len(phase3_summary['ensemble_models'])
        }
        
        y_pos = np.arange(len(final_summary))
        plt.barh(y_pos, [1]*len(final_summary), color='lightblue', alpha=0.7)
        plt.yticks(y_pos, list(final_summary.keys()))
        plt.title('Final Summary')
        
        for i, (key, value) in enumerate(final_summary.items()):
            plt.text(0.5, i, str(value), ha='center', va='center', fontweight='bold')
        
        plt.tight_layout()
        plt.savefig('data/final_three_phase_comparison.png', dpi=300, bbox_inches='tight')
        plt.show()
        
        return True
        
    except Exception as e:
        print(f"Final karşılaştırma hatası: {e}")
        return False

def main():
    """Ana fonksiyon - 3 fazı çalıştır"""
    print("🚀 3 FAZLI YAKLAŞIM BAŞLATILIYOR")
    print("=" * 60)
    
    phases = [
        ('phase1_self_supervised.py', 'PHASE 1: SELF-SUPERVISED PRE-TRAINING'),
        ('phase2_supervised_finetuning.py', 'PHASE 2: SUPERVISED FINE-TUNING'),
        ('phase3_ensemble.py', 'PHASE 3: ENSEMBLE METHODS')
    ]
    
    results = {}
    total_time = 0
    
    for phase_script, phase_name in phases:
        success, duration = run_phase(phase_script, phase_name)
        results[phase_name] = {'success': success, 'duration': duration}
        total_time += duration
        
        if not success:
            print(f"❌ {phase_name} başarısız! Devam ediliyor...")
    
    # Final karşılaştırma
    print(f"\n{'='*60}")
    print("FINAL KARŞILAŞTIRMA OLUŞTURULUYOR...")
    print(f"{'='*60}")
    
    create_final_comparison()
    
    # Sonuç özeti
    print(f"\n{'='*60}")
    print("3 FAZLI YAKLAŞIM TAMAMLANDI!")
    print(f"{'='*60}")
    
    for phase_name, result in results.items():
        status = "✅ BAŞARILI" if result['success'] else "❌ BAŞARISIZ"
        print(f"{phase_name}: {status} ({result['duration']:.2f}s)")
    
    print(f"\nToplam süre: {total_time:.2f} saniye")
    print(f"Başarılı faz: {sum(1 for r in results.values() if r['success'])}/3")
    
    print(f"\n📁 Oluşturulan dosyalar:")
    print(f"  - data/phase1_*.csv, *.json, *.png")
    print(f"  - data/phase2_*.csv, *.json, *.png") 
    print(f"  - data/phase3_*.csv, *.json, *.png")
    print(f"  - data/final_three_phase_comparison.png")
    
    return results

if __name__ == "__main__":
    results = main()
