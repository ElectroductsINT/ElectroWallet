
import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, LineStyle, AreaSeriesPartialOptions, CandlestickSeriesPartialOptions } from 'lightweight-charts';
import { marketDataGenerator, CandleData } from '../services/marketData';
import { formatPrice } from '../utils/formatters';

interface MarketChartProps {
  data: { time: number; price: number }[];
  symbol?: string;
  chartType?: 'line' | 'candle';
}

const MarketChart: React.FC<MarketChartProps> = ({ data, symbol = 'BTC', chartType = 'line' }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const seriesRef = useRef<any>(null);
  const [candleData, setCandleData] = useState<CandleData[]>([]);
  const [volatility, setVolatility] = useState(0);
  const [rsi, setRsi] = useState(50);

  // Generate candlestick data from price history
  useEffect(() => {
    if (data && data.length > 0) {
      const basePrice = data[0]?.price || 100;
      const candles = marketDataGenerator.generateCandleData(symbol, basePrice, 48, 5);
      setCandleData(candles);

      // Calculate technical indicators
      const prices = data.map(d => d.price);
      const vol = marketDataGenerator.calculateVolatility(prices);
      const rsiValue = marketDataGenerator.calculateRSI(prices);
      setVolatility(vol);
      setRsi(rsiValue);
    }
  }, [data, symbol]);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#e9ecf5',
        fontSize: 11,
        fontFamily: "'JetBrains Mono', monospace",
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.08)',
        autoScale: true,
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.08)',
        secondsVisible: true,
        timeVisible: true,
      },
      grid: {
        horzLines: { color: 'rgba(255,255,255,0.04)' },
        vertLines: { color: 'rgba(255,255,255,0.04)' },
      },
      crosshair: {
        horzLine: { color: '#5ee7df', width: 1, style: LineStyle.Solid },
        vertLine: { color: '#5ee7df', width: 1, style: LineStyle.Solid },
      },
      localization: { 
        priceFormatter: (p) => `$${p.toLocaleString(undefined, { maximumFractionDigits: 2 })}` 
      },
    });

    const resize = () => {
      const width = containerRef.current?.clientWidth || 0;
      const height = containerRef.current?.clientHeight || 0;
      if (width && height) {
        chart.applyOptions({ width, height });
      }
    };
    
    // Initial resize
    requestAnimationFrame(resize);
    
    // Responsive resize listener
    const resizeObserver = new ResizeObserver(resize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    chartRef.current = chart;

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current || !chartRef.current) return;

    const chart = chartRef.current;

    // Remove old series
    if (seriesRef.current) {
      chart.removeSeries(seriesRef.current);
    }

    if (chartType === 'candle' && candleData.length > 0) {
      // Candlestick chart with comforting colors
      const candleOptions: CandlestickSeriesPartialOptions = {
        upColor: '#6ee7b7',      // Warm mint (comforting green)
        downColor: '#f87171',     // Softer red
        borderVisible: true,
        wickUpColor: '#6ee7b7',
        wickDownColor: '#f87171',
      };

      const candleSeries = chart.addCandlestickSeries(candleOptions);
      candleSeries.setData(candleData);
      seriesRef.current = candleSeries;
    } else if (data && data.length > 0) {
      // Line/Area chart with comforting gradient
      const areaOptions: AreaSeriesPartialOptions = {
        lineColor: '#5ee7df',      // Calming teal
        topColor: 'rgba(94, 231, 223, 0.35)',
        bottomColor: 'rgba(94, 231, 223, 0.04)',
        lineWidth: 2,
        priceLineVisible: false,
      };

      const areaSeries = chart.addAreaSeries(areaOptions);
      const normalized = data.map(d => ({ time: Math.floor(d.time / 1000), value: d.price }));
      areaSeries.setData(normalized);
      areaSeries.update(normalized[normalized.length - 1]);
      seriesRef.current = areaSeries;
    }

    chart.timeScale()?.fitContent();
  }, [data, chartType, candleData]);

  if (!data || data.length < 2) {
    return (
      <div className="h-64 flex items-center justify-center rounded-2xl glass shadow-3d overflow-hidden">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
          <p className="text-xs font-mono text-white/40 animate-pulse">Initializing market stream…</p>
        </div>
      </div>
    );
  }

  const latest = data[data.length - 1];
  const previous = data[Math.max(0, data.length - 60)];
  const change = previous ? ((latest.price - previous.price) / previous.price) * 100 : 0;

  return (
    <div className="relative w-full rounded-2xl overflow-hidden group">
      {/* 3D Perspective Container */}
      <div className="glass shadow-3d hover:shadow-3d-lg transition-all duration-500 ease-out transform hover:-translate-y-1" 
           style={{ perspective: '1200px' }}>
        
        {/* Chart Container with 3D tilt effect */}
        <div ref={containerRef} 
             className="w-full h-80 md:h-96 lg:h-[500px] bg-gradient-to-br from-slate-900/50 via-slate-800/30 to-slate-900/50"
             style={{
               transform: 'rotateX(0deg) rotateY(0deg)',
               transformOrigin: 'center',
               transition: 'transform 0.6s ease-out'
             }} 
        />

        {/* Info Overlay with 3D positioning */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 lg:p-6">
          {/* Top Right - Price with glow */}
          <div className="ml-auto text-right">
            <p className="text-[10px] font-mono text-white/50 uppercase tracking-widest">Live Price</p>
            <p className="text-2xl md:text-3xl font-bold font-mono text-white drop-shadow-[0_0_20px_rgba(94,231,223,0.4)]">
              ${formatPrice(latest.price)}
            </p>
            <p className={`text-[10px] font-mono font-semibold ${change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {change >= 0 ? '↑ +' : '↓ '}{Math.abs(change).toFixed(1)}% (1h) · Real-time
            </p>
          </div>

          {/* Bottom Left - Technical Indicators with glassmorphism */}
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-[9px]">
              <div className="glass rounded-xl px-3 py-2 hover:bg-white/8 transition-all cursor-default">
                <p className="text-white/50 uppercase tracking-wider text-[8px]">Vol</p>
                <p className="font-mono text-white font-bold text-sm">{Math.round(volatility * 100)}%</p>
              </div>
              <div className="glass rounded-xl px-3 py-2 hover:bg-white/8 transition-all cursor-default">
                <p className="text-white/50 uppercase tracking-wider text-[8px]">RSI</p>
                <p className={`font-mono font-bold text-sm ${rsi > 70 ? 'text-rose-400' : rsi < 30 ? 'text-emerald-400' : 'text-cyan-400'}`}>
                  {rsi.toFixed(1)}
                </p>
              </div>
              <div className="glass rounded-xl px-3 py-2 hover:bg-white/8 transition-all cursor-default">
                <p className="text-white/50 uppercase tracking-wider text-[8px]">Type</p>
                <p className="font-mono text-white font-bold text-sm">{chartType.toUpperCase()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Gradient light effect for depth */}
        <div className="absolute inset-0 pointer-events-none opacity-40" 
             style={{ 
               background: 'radial-gradient(circle at 60% 40%, rgba(94, 231, 223, 0.1) 0%, transparent 60%)',
             }} 
        />
      </div>
    </div>
  );
};

export default MarketChart;
