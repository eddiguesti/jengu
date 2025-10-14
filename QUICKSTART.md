# 🚀 Quick Start Guide

## ✅ Your App is Running!

**Access URL:** **http://localhost:8502**

---

## 📋 What You Have

### **Clean, Modern Design**
- White background + Monday.com blue
- Professional Poppins & Inter fonts
- Smooth animations & hover effects
- Error-safe components

### **5 Pages**
1. **🏠 Dashboard** - KPIs & trends
2. **📂 Data & Enrichment** - Upload → Enrich workflow
3. **🔬 Correlation Discovery** - Weather & temporal analysis
4. **🎯 Price Optimizer** - Revenue maximization
5. **💡 Insights** - Automated intelligence

---

## 🎯 Core Workflow

### **1. Upload Data** (2 mins)
- Go to "📂 Data & Enrichment"
- Upload CSV with booking history
- Required columns: `booking_date`, `checkin_date`, `destination`, `final_price`

### **2. Enrich Data** (1 min)
- Check ✅ Weather Data
- Check ✅ Temporal Features
- Click "⚡ Enrich Data Now"
- Wait for enrichment to complete

### **3. Discover Correlations** (1 min)
- Go to "🔬 Correlation Discovery"
- Select target: `final_price`
- Click "🔬 Analyze Correlations"
- View heatmap + weather impact

### **4. Optimize Prices** (30 secs)
- Go to "🎯 Price Optimizer"
- Enter booking details
- Click "🚀 Optimize Price"
- See optimal price + curve

---

## 🎨 Design Features

### **Clean & Modern**
- White cards with subtle shadows
- Monday blue (#0073ea) primary color
- Spotify green (#00d647) accents
- Minimal borders & spacing

### **Error Handling**
- All components wrapped in try/catch
- User-friendly error messages
- Graceful degradation
- Logging enabled

---

## 💡 Key Capabilities

### **Weather Enrichment**
- Temperature analysis
- Precipitation tracking
- Weather quality score (0-100)
- Automatic correlation

### **Correlation Discovery**
- Pearson & Spearman methods
- P-value significance testing
- Interactive heatmaps
- Feature importance ranking

### **Price Optimization**
- Elasticity-based algorithms
- Revenue maximization
- Sensitivity curves
- Constraint handling

---

## 🔧 Troubleshooting

### **App Not Loading?**
```bash
# Restart the app
.venv\Scripts\streamlit run apps\ui\streamlit_app.py
```

### **Upload Errors?**
- Check CSV format
- Ensure date columns exist
- Verify numeric price column

### **Enrichment Fails?**
- Check internet connection
- Verify destination names
- Try with fewer rows first

---

## 📊 Sample CSV Format

```csv
booking_date,checkin_date,checkout_date,destination,final_price
2024-01-15,2024-02-10,2024-02-17,Paris,1500.00
2024-01-16,2024-02-12,2024-02-19,London,1800.00
2024-01-17,2024-02-15,2024-02-22,Tokyo,2200.00
```

---

## ✨ Pro Tips

1. **Upload 6+ months** of data for best results
2. **Always enrich with weather** before correlation analysis
3. **Check p-values** - only trust correlations <0.05
4. **Start conservative** with elasticity (-1.5 is good)
5. **Review insights daily** for new opportunities

---

## 🎯 Next Steps

1. **Upload your real booking data**
2. **Enrich with weather & temporal features**
3. **Discover what drives your pricing**
4. **Optimize prices for maximum revenue**
5. **Monitor insights for opportunities**

---

**Your premium pricing engine is ready to use!** 🚀

Open **http://localhost:8502** and start optimizing! 💎
