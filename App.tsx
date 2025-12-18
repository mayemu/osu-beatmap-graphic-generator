import React, { useState } from 'react';
import { extractBeatmapSetId, fetchBeatmapData } from './services/osu';
import { BannerData, LoadingState, BannerConfig, BannerSize, DecorationType } from './types';
import BannerPreview from './components/BannerPreview';

declare global {
  interface Window {
    html2canvas: any;
    htmlToImage: any;
  }
}

// Curated Color Themes
const COLOR_THEMES = [
  { name: 'Osu! Pink', accent: '#ec4899', overlay: '#111827' },
  { name: 'Midnight', accent: '#818cf8', overlay: '#0f172a' },
  { name: 'Cyberpunk', accent: '#06b6d4', overlay: '#020617' },
  { name: 'Crimson', accent: '#f43f5e', overlay: '#2c0b0e' },
  { name: 'Forest', accent: '#10b981', overlay: '#062c19' },
  { name: 'Gold', accent: '#f59e0b', overlay: '#1f1501' },
  { name: 'Amethyst', accent: '#a855f7', overlay: '#1e1b4b' },
  { name: 'Slate', accent: '#94a3b8', overlay: '#0f172a' },
];

const App: React.FC = () => {
  const [inputUrl, setInputUrl] = useState('');
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [bannerData, setBannerData] = useState<BannerData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const bannerRefId = 'osu-banner-export';
  
  // Configuration State
  const [config, setConfig] = useState<BannerConfig>({
    showBpm: false,
    showStatus: true,
    font: 'Exo 2',
    size: 'large',
    decoration: 'circles',
    customText: '',
    selectedDifficultyId: null,
    accentColor: COLOR_THEMES[0].accent,
    overlayColor: COLOR_THEMES[0].overlay
  });

  const [isCustomColor, setIsCustomColor] = useState(false);
  // Auto match enabled by default
  const [isAutoColor, setIsAutoColor] = useState(true);

  // Helper to convert blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') resolve(reader.result);
        else reject(new Error('Failed to convert image'));
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Robust image fetcher with CORS proxy fallback
  const convertImageToBase64 = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url, { mode: 'cors', cache: 'reload' });
      if (response.ok) {
        const blob = await response.blob();
        return await blobToBase64(blob);
      }
      throw new Error('Direct fetch failed');
    } catch (directError) {
      try {
        const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=jpg`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('Proxy fetch failed');
        const blob = await response.blob();
        return await blobToBase64(blob);
      } catch (proxyError) {
        console.error("All image fetch attempts failed", proxyError);
        return url;
      }
    }
  };

  const extractColorsFromImage = (imageSrc: string): Promise<{ accent: string, overlay: string }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous"; 
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve({ accent: '#ec4899', overlay: '#111827' }); return; }
        
        canvas.width = 50; 
        canvas.height = 50;
        ctx.drawImage(img, 0, 0, 50, 50);
        
        const data = ctx.getImageData(0, 0, 50, 50).data;
        let r = 0, g = 0, b = 0, count = 0;
        
        for (let i = 0; i < data.length; i += 16) { 
             const cr = data[i];
             const cg = data[i + 1];
             const cb = data[i + 2];
             
             const brightness = (cr + cg + cb) / 3;
             if (brightness > 40 && brightness < 230) {
                 r += cr;
                 g += cg;
                 b += cb;
                 count++;
             }
        }
        
        if (count === 0) { resolve({ accent: '#ec4899', overlay: '#111827' }); return; }
        
        const avgR = Math.round(r / count);
        const avgG = Math.round(g / count);
        const avgB = Math.round(b / count);
        
        const toHex = (n: number) => {
            const hex = Math.max(0, Math.min(255, n)).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        
        const accent = `#${toHex(avgR)}${toHex(avgG)}${toHex(avgB)}`;
        const darkR = Math.floor(avgR * 0.15);
        const darkG = Math.floor(avgG * 0.15);
        const darkB = Math.floor(avgB * 0.22); 
        
        const overlay = `#${toHex(Math.max(8, darkR))}${toHex(Math.max(12, darkG))}${toHex(Math.max(16, darkB))}`;
        
        resolve({ accent, overlay });
      };
      
      img.onerror = () => resolve({ accent: '#ec4899', overlay: '#111827' });
      img.src = imageSrc;
    });
  };

  const handleGenerate = async () => {
    if (!inputUrl) return;

    setError(null);
    setLoadingState(LoadingState.FETCHING_MAP);
    setBannerData(null);

    const setId = extractBeatmapSetId(inputUrl);

    if (!setId) {
      setError("Invalid Osu! beatmap URL. It should look like https://osu.ppy.sh/beatmapsets/...");
      setLoadingState(LoadingState.ERROR);
      return;
    }

    try {
      const data = await fetchBeatmapData(setId);
      
      setLoadingState(LoadingState.PROCESSING_IMAGE);
      
      const rawBgUrl = data.covers.cover2x || data.covers.card2x || data.covers.cover;
      const bgBase64 = await convertImageToBase64(rawBgUrl);

      const initialBanner: BannerData = {
        title: data.title,
        artist: data.artist,
        mapper: data.creator,
        backgroundUrl: bgBase64,
        bpm: data.bpm,
        status: data.status,
        difficulties: data.difficulties || []
      };
      
      if (isAutoColor) {
         try {
             const colors = await extractColorsFromImage(bgBase64);
             setConfig(prev => ({ ...prev, accentColor: colors.accent, overlayColor: colors.overlay }));
             setIsCustomColor(true); 
         } catch (e) {
             console.warn("Auto-theme failed during generate", e);
         }
      }

      setBannerData(initialBanner);
      setLoadingState(LoadingState.SUCCESS);

    } catch (err: any) {
      console.error(err);
      const msg = err.message || "Failed to fetch beatmap data.";
      if (msg.includes("not found")) {
        setError("Map not found on Nerinyan or Mino. It might be too new or unranked!");
      } else {
        setError("Failed to fetch beatmap data. Please check the ID or try again.");
      }
      setLoadingState(LoadingState.ERROR);
    }
  };

  const handleDownload = async () => {
    const element = document.getElementById(bannerRefId);
    if (!element) return;

    try {
      // Wait for all fonts to load before capturing
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      
      // Preload fonts by rendering text to a hidden canvas with each font
      const fonts = ['Exo 2', 'Lexend', 'Comfortaa', 'Poppins', 'Manrope', 'Inter', 'Roboto Mono', 'Playfair Display', 'Montserrat', 'Oswald', 'Raleway', 'Permanent Marker'];
      const preloadCanvas = document.createElement('canvas');
      const ctx = preloadCanvas.getContext('2d');
      if (ctx) {
        fonts.forEach(font => {
          ctx.font = `16px "${font}"`;
          ctx.fillText('Sample', 0, 20);
        });
      }
      
      // Additional delay to ensure fonts are rendered
      await new Promise(resolve => setTimeout(resolve, 500));

      // Try using html-to-image library first (better font support)
      if (window.htmlToImage) {
        try {
          const dataUrl = await window.htmlToImage.toPng(element, {
            cacheBust: true,
            pixelRatio: 2,
          });
          
          const link = document.createElement('a');
          link.download = `osu-banner-${bannerData?.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
          link.href = dataUrl;
          link.click();
          return;
        } catch (err) {
          console.warn("html-to-image failed, falling back to html2canvas", err);
        }
      }

      // Fallback to html2canvas
      if (!window.html2canvas) {
        alert("Image generation library not loaded.");
        return;
      }

      const canvas = await window.html2canvas(element, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        backgroundColor: null,
        logging: false,
        imageTimeout: 15000,
      });

      const link = document.createElement('a');
      link.download = `osu-banner-${bannerData?.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error("Download failed:", err);
      alert("Could not generate image. Please try again.");
    }
  };

  const applyTheme = (theme: typeof COLOR_THEMES[0]) => {
      setConfig({
          ...config,
          accentColor: theme.accent,
          overlayColor: theme.overlay
      });
      setIsCustomColor(false);
      setIsAutoColor(false); 
  };

  const handleAutoColorToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const checked = e.target.checked;
      setIsAutoColor(checked);

      if (checked && bannerData?.backgroundUrl) {
          try {
              const colors = await extractColorsFromImage(bannerData.backgroundUrl);
              setConfig(prev => ({ ...prev, accentColor: colors.accent, overlayColor: colors.overlay }));
              setIsCustomColor(true); 
          } catch (e) {
              console.warn("Auto-theme failed on toggle", e);
          }
      }
  };

  const bannerSizeOptions: { value: BannerSize; label: string; dim: string }[] = [
    { value: 'large', label: 'Large', dim: '1000x350' },
    { value: 'medium', label: 'Medium', dim: '1000x250' },
    { value: 'slim', label: 'Slim', dim: '1000x180' },
    { value: 'compact', label: 'Compact', dim: '850x220' },
    { value: 'micro', label: 'Micro', dim: '600x160' },
  ];

  const decorationOptions: { value: DecorationType; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'circles', label: 'Circles' },
    { value: 'triangles', label: 'Triangles' },
    { value: 'hexagons', label: 'Hexagons' },
    { value: 'curves', label: 'Curves' },
    { value: 'leaves', label: 'Leaves' },
    { value: 'frogs', label: 'Frogs' },
  ];

  // Website Theme Styles
  const siteStyle = {
      backgroundColor: config.overlayColor,
  };
  
  const accentTextStyle = {
      backgroundImage: `linear-gradient(to right, ${config.accentColor}, #ffffff)`,
  };

  const buttonStyle = {
      backgroundImage: `linear-gradient(to right, ${config.accentColor}, ${config.accentColor}cc)`,
  };
  
  const glowingOrbStyle = {
      backgroundColor: config.accentColor,
  };

  return (
    <div 
        className="min-h-screen w-full text-gray-100 flex flex-col items-center py-12 px-4 relative overflow-y-auto font-sans transition-colors duration-700 ease-in-out"
        style={siteStyle}
    >
      {/* Background Ambience - Dynamic Colors - Reduced opacity to 5% */}
      <div 
        className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] pointer-events-none opacity-5 transition-colors duration-700"
        style={glowingOrbStyle}
      ></div>
      <div 
        className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] pointer-events-none opacity-5 transition-colors duration-700"
        style={glowingOrbStyle}
      ></div>

      <header className="mb-10 text-center z-10">
        <h1 
            className="text-5xl font-extrabold text-transparent bg-clip-text mb-4 font-lexend transition-all duration-700 pb-2 leading-tight"
            style={accentTextStyle}
        >
          osu! beatmap graphic gen
        </h1>
        <p className="text-gray-400 max-w-lg mx-auto tracking-wide">
          aesthetic graphics for your favorite beatmaps
        </p>
      </header>

      <main className="w-full max-w-5xl z-10 flex flex-col gap-8 pb-20">
        {/* Input Section */}
        <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700 p-6 rounded-2xl shadow-xl transition-colors duration-700">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Paste osu! beatmap link (e.g., https://osu.ppy.sh/beatmapsets/...)"
              className="flex-1 bg-gray-900/50 border border-gray-600 rounded-xl px-5 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all"
              style={{ '--tw-ring-color': config.accentColor } as React.CSSProperties}
            />
            <button
              onClick={handleGenerate}
              disabled={loadingState === LoadingState.FETCHING_MAP || loadingState === LoadingState.PROCESSING_IMAGE}
              className={`
                px-8 py-3 rounded-xl font-bold text-lg transition-all shadow-lg whitespace-nowrap
                ${loadingState === LoadingState.FETCHING_MAP || loadingState === LoadingState.PROCESSING_IMAGE
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'text-white hover:shadow-lg active:scale-95'}
              `}
              style={
                  (loadingState !== LoadingState.FETCHING_MAP && loadingState !== LoadingState.PROCESSING_IMAGE) 
                  ? { ...buttonStyle, boxShadow: `0 4px 14px 0 ${config.accentColor}55` } 
                  : {}
              }
            >
              {loadingState === LoadingState.FETCHING_MAP ? 'Fetching...' : 
               loadingState === LoadingState.PROCESSING_IMAGE ? 'Processing...' : 'Generate'}
            </button>
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-200 text-sm flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              {error}
            </div>
          )}
        </div>

        {/* Customization Panel */}
        <div className="bg-gray-800/30 backdrop-blur-md border border-gray-700/50 p-6 rounded-2xl transition-colors duration-700">
            <div className="flex justify-between items-center mb-4">
                 <h3 className="text-sm uppercase tracking-widest text-gray-400 font-bold">Customization</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Col 1: Style & Fonts */}
                <div className="flex flex-col gap-5">
                    {/* Size Selector */}
                    <div className="flex flex-col gap-2">
                        <span className="text-gray-300 text-sm font-medium">Dimensions</span>
                        <div className="flex flex-wrap gap-2">
                            {bannerSizeOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setConfig({ ...config, size: opt.value })}
                                    className={`
                                        flex-1 min-w-[80px] py-1.5 px-2 rounded-md text-xs font-medium transition-all border border-transparent
                                        ${config.size === opt.value 
                                            ? 'text-white border-gray-500 shadow-sm' 
                                            : 'bg-gray-900/40 text-gray-400 hover:text-gray-200 hover:bg-gray-800'}
                                    `}
                                    style={config.size === opt.value ? { backgroundColor: config.accentColor } : {}}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Font Selector */}
                    <div className="flex flex-col gap-2">
                        <span className="text-gray-300 text-sm font-medium">Font Family</span>
                        <div className="relative">
                            <select 
                                value={config.font}
                                onChange={(e) => setConfig({ ...config, font: e.target.value })}
                                className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-opacity-50 appearance-none cursor-pointer"
                                style={{ '--tw-ring-color': config.accentColor } as React.CSSProperties}
                            >
                                <option value="Lexend">Lexend (Modern)</option>
                                <option value="Comfortaa">Comfortaa (Rounded)</option>
                                <option value="Poppins">Poppins (Geometric)</option>
                                <option value="Manrope">Manrope (Clean)</option>
                                <option value="Exo 2">Exo 2 (Sci-Fi)</option>
                                <option value="Inter">Inter (Standard)</option>
                                <option value="Roboto Mono">Roboto Mono (Code)</option>
                                <option value="Playfair Display">Playfair (Serif)</option>
                                <option value="Montserrat">Montserrat (Bold)</option>
                                <option value="Oswald">Oswald (Tall)</option>
                                <option value="Raleway">Raleway (Elegant)</option>
                                <option value="Permanent Marker">Marker (Handwritten)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Col 2: Colors */}
                <div className="flex flex-col gap-5">
                     <div className="flex justify-between items-center">
                        <span className="text-gray-300 text-sm font-medium">Color Theme</span>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-300 hover:text-white transition-colors">
                                <input 
                                    type="checkbox" 
                                    checked={isAutoColor} 
                                    onChange={handleAutoColorToggle}
                                    className="w-3.5 h-3.5 rounded focus:ring-opacity-50 bg-gray-800 border-gray-600"
                                    style={{ color: config.accentColor, '--tw-ring-color': config.accentColor } as React.CSSProperties}
                                />
                                <span>Auto-match</span>
                            </label>
                            <button 
                                onClick={() => {
                                    setIsCustomColor(!isCustomColor);
                                    if (isAutoColor && !isCustomColor) setIsAutoColor(false);
                                }}
                                className="text-xs hover:opacity-80 underline decoration-dotted transition-colors"
                                style={{ color: config.accentColor }}
                            >
                                {isCustomColor ? "Use Presets" : "Custom Colors"}
                            </button>
                        </div>
                     </div>

                     {!isCustomColor ? (
                        <div className="grid grid-cols-4 gap-3">
                            {COLOR_THEMES.map((theme) => (
                                <button
                                    key={theme.name}
                                    onClick={() => applyTheme(theme)}
                                    className={`
                                        h-10 rounded-lg flex items-center justify-center border-2 transition-all
                                        ${config.accentColor === theme.accent && config.overlayColor === theme.overlay && !isAutoColor
                                            ? 'border-white scale-105 shadow-md' 
                                            : 'border-transparent hover:border-gray-500'}
                                    `}
                                    style={{ background: `linear-gradient(135deg, ${theme.overlay} 50%, ${theme.accent} 50%)` }}
                                    title={theme.name}
                                />
                            ))}
                        </div>
                     ) : (
                        <div className="space-y-4 animate-fade-in-up">
                             <div className="flex flex-col gap-2">
                                 <span className="text-gray-400 text-xs uppercase">Accent</span>
                                 <div className="flex gap-3 items-center">
                                    <input 
                                        type="color" 
                                        value={config.accentColor}
                                        onChange={(e) => setConfig({...config, accentColor: e.target.value})}
                                        className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0 overflow-hidden" 
                                    />
                                    <div className="flex-1 bg-gray-900/50 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-400 font-mono">
                                        {config.accentColor}
                                    </div>
                                 </div>
                             </div>
                             <div className="flex flex-col gap-2">
                                 <span className="text-gray-400 text-xs uppercase">Overlay</span>
                                 <div className="flex gap-3 items-center">
                                    <input 
                                        type="color" 
                                        value={config.overlayColor}
                                        onChange={(e) => setConfig({...config, overlayColor: e.target.value})}
                                        className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0 overflow-hidden" 
                                    />
                                    <div className="flex-1 bg-gray-900/50 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-400 font-mono">
                                        {config.overlayColor}
                                    </div>
                                 </div>
                             </div>
                        </div>
                     )}
                </div>

                {/* Col 3: Content & Decoration */}
                <div className="flex flex-col gap-5">
                     
                     <div className="flex flex-col gap-2">
                        <span className="text-gray-300 text-sm font-medium">Design Element</span>
                        <div className="relative">
                            <select 
                                value={config.decoration}
                                onChange={(e) => setConfig({ ...config, decoration: e.target.value as DecorationType })}
                                className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-opacity-50 appearance-none cursor-pointer capitalize"
                                style={{ '--tw-ring-color': config.accentColor } as React.CSSProperties}
                            >
                                {decorationOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                     </div>

                     {/* Difficulty Selector */}
                     {bannerData?.difficulties && bannerData.difficulties.length > 0 && (
                         <div className="flex flex-col gap-2">
                             <span className="text-gray-300 text-sm font-medium">Difficulty Badge</span>
                             <div className="relative">
                                 <select 
                                     value={config.selectedDifficultyId || ''}
                                     onChange={(e) => {
                                         const val = e.target.value ? Number(e.target.value) : null;
                                         setConfig({ ...config, selectedDifficultyId: val });
                                     }}
                                     className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-opacity-50 appearance-none cursor-pointer"
                                     style={{ '--tw-ring-color': config.accentColor } as React.CSSProperties}
                                 >
                                     <option value="">(None)</option>
                                     {bannerData.difficulties.map(diff => (
                                         <option key={diff.id} value={diff.id}>
                                             {diff.version} ({diff.difficulty_rating.toFixed(2)}★)
                                         </option>
                                     ))}
                                 </select>
                             </div>
                         </div>
                     )}
                     
                    {/* Toggles */}
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer group bg-gray-900/30 p-2 rounded-lg border border-gray-700/50 hover:border-gray-600 transition-all flex-1 justify-center">
                            <input 
                                type="checkbox" 
                                className="w-4 h-4 rounded focus:ring-opacity-50 bg-gray-800 border-gray-600" 
                                checked={config.showStatus} 
                                onChange={(e) => setConfig({...config, showStatus: e.target.checked})}
                                style={{ color: config.accentColor, '--tw-ring-color': config.accentColor } as React.CSSProperties}
                            />
                            <span className="text-xs text-gray-400 group-hover:text-white transition-colors select-none">Status</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer group bg-gray-900/30 p-2 rounded-lg border border-gray-700/50 hover:border-gray-600 transition-all flex-1 justify-center">
                            <input 
                                type="checkbox" 
                                className="w-4 h-4 rounded focus:ring-opacity-50 bg-gray-800 border-gray-600" 
                                checked={config.showBpm} 
                                onChange={(e) => setConfig({...config, showBpm: e.target.checked})} 
                                style={{ color: config.accentColor, '--tw-ring-color': config.accentColor } as React.CSSProperties}
                            />
                            <span className="text-xs text-gray-400 group-hover:text-white transition-colors select-none">BPM</span>
                        </label>
                    </div>
                </div>
            </div>
            
             {/* Editable Text Section - Render only if we have data */}
            {bannerData && (
                 <div className="mt-8 pt-6 border-t border-gray-700/50">
                     <h3 className="text-sm uppercase tracking-widest text-gray-400 font-bold mb-4">Content Overrides</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                         <div className="flex flex-col gap-2">
                             <span className="text-gray-400 text-xs font-medium">Title</span>
                             <input 
                                 type="text" 
                                 value={bannerData.title}
                                 onChange={(e) => setBannerData({...bannerData, title: e.target.value})}
                                 className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-opacity-50"
                                 style={{ '--tw-ring-color': config.accentColor } as React.CSSProperties}
                             />
                         </div>
                         <div className="flex flex-col gap-2">
                             <span className="text-gray-400 text-xs font-medium">Artist</span>
                             <input 
                                 type="text" 
                                 value={bannerData.artist}
                                 onChange={(e) => setBannerData({...bannerData, artist: e.target.value})}
                                 className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-opacity-50"
                                 style={{ '--tw-ring-color': config.accentColor } as React.CSSProperties}
                             />
                         </div>
                         <div className="flex flex-col gap-2">
                             <span className="text-gray-400 text-xs font-medium">Mapper</span>
                             <input 
                                 type="text" 
                                 value={bannerData.mapper}
                                 onChange={(e) => setBannerData({...bannerData, mapper: e.target.value})}
                                 className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-opacity-50"
                                 style={{ '--tw-ring-color': config.accentColor } as React.CSSProperties}
                             />
                         </div>
                         <div className="flex flex-col gap-2">
                             <span className="text-gray-400 text-xs font-medium">Custom Text</span>
                             <input
                                type="text"
                                value={config.customText}
                                onChange={(e) => setConfig({ ...config, customText: e.target.value })}
                                placeholder="Subtitle"
                                className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-opacity-50"
                                style={{ '--tw-ring-color': config.accentColor } as React.CSSProperties}
                             />
                         </div>
                     </div>
                 </div>
            )}
        </div>

        {/* Result Section */}
        {bannerData && (
          <div className="animate-fade-in-up space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-200">Preview</h2>
                <div className="flex gap-2 items-center">
                    {/* View Full Size Button */}
                     <button
                        onClick={() => setShowFullPreview(true)}
                        className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-md text-xs text-white border border-gray-600 transition-colors mr-2"
                     >
                         View Full
                     </button>
                     <span className="px-3 py-1 bg-gray-800 rounded-md text-xs text-gray-400 border border-gray-700 font-mono">
                        {bannerSizeOptions.find(o => o.value === config.size)?.dim}
                     </span>
                </div>
            </div>

            {/* Scroll container for mobile users */}
            <div className="w-full overflow-x-auto pb-4 custom-scrollbar flex justify-center bg-gray-900/20 rounded-xl p-4 border border-gray-800/50 transition-colors duration-700">
                <div style={{ minWidth: 'auto' }}>
                    <BannerPreview data={bannerData} config={config} id={bannerRefId} />
                </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleDownload}
                className="group relative px-8 py-4 bg-gray-100 text-gray-900 font-bold rounded-xl shadow-xl hover:bg-white transition-all flex items-center gap-3 overflow-hidden"
              >
                <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity"
                    style={{ backgroundImage: `linear-gradient(to right, ${config.accentColor}, white)` }}
                ></div>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Banner
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Full Size Preview Modal */}
      {showFullPreview && bannerData && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowFullPreview(false)}>
              <div 
                  className="relative max-w-full max-h-full overflow-auto bg-transparent rounded-xl shadow-2xl p-2 border border-white/10" 
                  onClick={e => e.stopPropagation()}
              >
                  <button 
                      onClick={() => setShowFullPreview(false)}
                      className="absolute -top-4 -right-4 bg-white text-black w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-lg hover:bg-gray-200 z-50"
                  >
                      ✕
                  </button>
                  <div className="overflow-auto max-w-[95vw] max-h-[90vh]">
                    <BannerPreview data={bannerData} config={config} />
                  </div>
              </div>
          </div>
      )}
      
      {/* Custom Styles for Animation and Scrollbar */}
      <style>{`
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
            animation: fadeInUp 0.5s ease-out forwards;
        }
        .custom-scrollbar::-webkit-scrollbar {
            height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
};

export default App;