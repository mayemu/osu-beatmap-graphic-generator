
import React from 'react';
import { BannerData, BannerConfig, BannerSize, DecorationType } from '../types';

interface BannerPreviewProps {
  data: BannerData;
  config: BannerConfig;
  id?: string; // DOM ID for html2canvas, optional for modal preview
}

const BannerPreview: React.FC<BannerPreviewProps> = ({ data, config, id }) => {
  
  // Refactored Layout Styles to ensure fitting
  const styles: Record<BannerSize, {
    container: string;
    padding: string;
    titleSize: string;
    artistSize: string;
    mapperSize: string;
    mapperLabelSize: string;
    dividerHeight: string;
    dividerMargin: string;
    badgeSize: string;
    customTextSize: string;
    layoutGap: string;
    titleMargin: string; 
  }> = {
    large: { // 1000x350
      container: "w-[1000px] h-[350px]",
      padding: "p-10",
      titleSize: "text-6xl",
      artistSize: "text-3xl",
      mapperSize: "text-2xl",
      mapperLabelSize: "text-sm",
      dividerHeight: "h-1.5 w-24",
      dividerMargin: "mt-2 mb-2",
      badgeSize: "text-xs px-3 py-1",
      customTextSize: "text-xl tracking-[0.2em]",
      layoutGap: "gap-1",
      titleMargin: "mb-0"
    },
    medium: { // 1000x250
      container: "w-[1000px] h-[250px]",
      padding: "p-8",
      titleSize: "text-5xl",
      artistSize: "text-2xl",
      mapperSize: "text-xl",
      mapperLabelSize: "text-xs",
      dividerHeight: "h-1 w-20",
      dividerMargin: "mt-2 mb-3", 
      badgeSize: "text-[10px] px-2 py-0.5",
      customTextSize: "text-base tracking-[0.15em]",
      layoutGap: "gap-0.5",
      titleMargin: "mb-[2px]"
    },
    slim: { // 1000x180 
      container: "w-[1000px] h-[180px]",
      padding: "p-6",
      titleSize: "text-3xl", 
      artistSize: "text-lg", 
      mapperSize: "text-base",
      mapperLabelSize: "text-xs",
      dividerHeight: "h-1 w-16",
      dividerMargin: "mt-2 mb-2.5", 
      badgeSize: "text-[9px] px-1.5 py-0.5",
      customTextSize: "text-xs tracking-widest",
      layoutGap: "gap-0",
      titleMargin: "mb-[4px]"
    },
    compact: { // 850x220
      container: "w-[850px] h-[220px]",
      padding: "p-6",
      titleSize: "text-4xl",
      artistSize: "text-xl",
      mapperSize: "text-lg",
      mapperLabelSize: "text-xs",
      dividerHeight: "h-1 w-16",
      dividerMargin: "mt-2 mb-3", 
      badgeSize: "text-[9px] px-1.5 py-0.5",
      customTextSize: "text-sm tracking-widest",
      layoutGap: "gap-0.5",
      titleMargin: "mb-[4px]"
    },
    micro: { // 600x160
      container: "w-[600px] h-[160px]",
      padding: "p-4",
      titleSize: "text-2xl",
      artistSize: "text-sm",
      mapperSize: "text-sm",
      mapperLabelSize: "text-[10px]",
      dividerHeight: "h-0.5 w-12",
      dividerMargin: "mt-2 mb-2", 
      badgeSize: "text-[8px] px-1 py-[1px]",
      customTextSize: "text-[9px] tracking-widest",
      layoutGap: "gap-0",
      titleMargin: "mb-[6px]"
    }
  };

  const currentStyle = styles[config.size];

  // Font class mapping
  const getFontClass = (font: string) => {
    switch (font) {
      case 'Inter': return 'font-sans';
      case 'Roboto Mono': return 'font-roboto';
      case 'Playfair Display': return 'font-playfair';
      case 'Montserrat': return 'font-montserrat';
      case 'Oswald': return 'font-oswald';
      case 'Raleway': return 'font-raleway';
      case 'Permanent Marker': return 'font-permanent';
      case 'Lexend': return 'font-lexend';
      case 'Comfortaa': return 'font-comfortaa';
      case 'Poppins': return 'font-poppins';
      case 'Manrope': return 'font-manrope';
      default: return 'font-exo';
    }
  };

  const fontClass = getFontClass(config.font);

  // Difficulty Logic
  const selectedDiff = config.selectedDifficultyId 
    ? data.difficulties?.find(d => d.id === config.selectedDifficultyId) 
    : null;

  // Dynamic Styles
  const accentStyle = { color: config.accentColor };
  const accentBgStyle = { backgroundColor: config.accentColor };
  
  const gradientOverlayStyle = {
    background: `linear-gradient(to top, ${config.overlayColor} 10%, ${config.overlayColor}66 45%, transparent 100%)`
  };
  
  const gradientSideStyle = {
    background: `linear-gradient(to right, ${config.overlayColor} 0%, ${config.overlayColor}40 40%, transparent 100%)`
  };

  // SVG Decorations
  const renderDecoration = (type: DecorationType) => {
    const commonClasses = "absolute right-[-15%] top-[-20%] h-[140%] w-[80%] pointer-events-none text-white mix-blend-screen opacity-60 overflow-hidden";
    
    const seededRandom = (seed: number) => {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    };

    const generatePattern = (
        renderShape: (props: { x: number, y: number, opacity: number, scale: number, rotation: number, index: number }) => React.ReactNode,
        gridConfig: { 
            rows?: number, 
            cols?: number, 
            scaleBase?: number, 
            scaleVar?: number,  
            jitter?: number,     
            rotationVar?: number 
        } = {}
    ) => {
        const { rows = 5, cols = 5, scaleBase = 1.8, scaleVar = 1.0, jitter = 0.6, rotationVar = 360 } = gridConfig;
        const items = [];
        const width = 200;
        const height = 200;
        const xStep = width / cols;
        const yStep = height / rows;

        for (let r = -2; r <= rows + 2; r++) {
            for (let c = -1; c <= cols + 2; c++) {
                const seed = r * 1337 + c * 31;
                let baseX = c * xStep;
                let baseY = r * yStep;
                const jitterX = (seededRandom(seed) - 0.5) * xStep * jitter;
                const jitterY = (seededRandom(seed + 1) - 0.5) * yStep * jitter;
                const x = baseX + jitterX;
                const y = baseY + jitterY;
                const normalizedX = Math.max(0, (x - 10) / 180);
                const opacity = Math.pow(normalizedX, 2.0); 
                if (opacity < 0.05) continue;
                const rndScale = seededRandom(seed + 2);
                const rndRot = seededRandom(seed + 3);
                const scale = scaleBase + (rndScale * scaleVar);
                const rotation = (rndRot - 0.5) * rotationVar; 
                items.push(renderShape({ x, y, opacity, scale, rotation, index: r * 100 + c }));
            }
        }
        return items;
    };

    switch (type) {
      case 'circles':
        return (
          <svg className={commonClasses} viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
             {generatePattern(({ x, y, opacity, scale, index }) => (
                 <circle 
                    key={index} 
                    cx={x} 
                    cy={y} 
                    r={12 * scale} 
                    stroke="currentColor" 
                    strokeWidth={1.2 / scale} 
                    fill="none"
                    opacity={opacity} 
                 />
             ), { rows: 5, cols: 5, scaleBase: 1.5, scaleVar: 1.0 })}
          </svg>
        );
      case 'triangles':
        return (
          <svg className={commonClasses} viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
            {generatePattern(({ x, y, opacity, scale, rotation, index }) => (
                <path 
                    key={index} 
                    d="M0 -15 L13 10 L-13 10 Z" 
                    transform={`translate(${x},${y}) rotate(${rotation}) scale(${scale})`}
                    stroke="currentColor" 
                    strokeWidth={0.6 / scale} 
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    fill="none"
                    opacity={opacity} 
                />
            ), { rows: 4, cols: 5, scaleBase: 1.5, scaleVar: 1.2 })}
          </svg>
        );
      case 'hexagons':
        return (
            <svg className={commonClasses} viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
                 {generatePattern(({ x, y, opacity, scale, rotation, index }) => (
                     <path 
                        key={index} 
                        d="M-10 0 L-5 -8.66 L5 -8.66 L10 0 L5 8.66 L-5 8.66 Z" 
                        transform={`translate(${x},${y}) rotate(${rotation}) scale(${scale})`}
                        stroke="currentColor" 
                        strokeWidth={0.6 / scale} 
                        strokeLinejoin="round"
                        fill="none" 
                        opacity={opacity} 
                    />
                 ), { rows: 5, cols: 5, scaleBase: 2.0, scaleVar: 0.8 })}
            </svg>
        );
      case 'curves': 
         return (
             <svg className={commonClasses} viewBox="0 0 200 200" preserveAspectRatio="none">
                 {generatePattern(({ x, y, opacity, scale, rotation, index }) => (
                    <path 
                        key={index} 
                        d="M-30 0 C-15 -25 15 25 30 0" 
                        transform={`translate(${x},${y}) rotate(${rotation}) scale(${scale})`}
                        stroke="currentColor" 
                        strokeWidth={0.8 / scale} 
                        strokeLinecap="round"
                        fill="none" 
                        opacity={opacity} 
                    />
                 ), { rows: 5, cols: 6, scaleBase: 2.0, scaleVar: 1.0, jitter: 0.8 })}
             </svg>
         );
        case 'leaves':
            return (
                <svg className={commonClasses} viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
                    {generatePattern(({ x, y, opacity, scale, rotation, index }) => (
                       <path 
                            key={index} 
                            d="M0 12 Q-8 0 0 -12 Q8 0 0 12 M0 -12 L0 12" 
                            transform={`translate(${x},${y}) rotate(${rotation}) scale(${scale})`} 
                            stroke="currentColor" 
                            strokeWidth={0.6 / scale} 
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                            opacity={opacity} 
                        />
                   ), { rows: 5, cols: 6, scaleBase: 1.3, scaleVar: 0.8 })}
                </svg>
            );
        case 'frogs':
            return (
                <svg className={commonClasses} viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
                     {generatePattern(({ x, y, opacity, scale, rotation, index }) => (
                         <g key={index} transform={`translate(${x},${y}) rotate(${rotation}) scale(${scale})`} opacity={opacity}>
                             <path
                                d="M-6 -2 A 2 2 0 1 1 -2 -2 L 2 -2 A 2 2 0 1 1 6 -2 A 6 5 0 0 1 -6 -2"
                                stroke="currentColor"
                                strokeWidth={1.2 / scale}
                                strokeLinejoin="round"
                                strokeLinecap="round"
                                fill="none"
                             />
                             <circle cx="-4" cy="-3" r={0.5} fill="currentColor" />
                             <circle cx="4" cy="-3" r={0.5} fill="currentColor" />
                         </g>
                     ), { rows: 5, cols: 5, scaleBase: 3.5, scaleVar: 0.5 })}
                </svg>
            );
      default:
        return null;
    }
  };

  return (
    <div className="inline-block shadow-2xl rounded-xl overflow-hidden bg-black">
      {/* 
          IMPORTANT: The 'rounded-xl' and 'overflow-hidden' classes must be on the element 
          referenced by 'id' so that html2canvas captures the rounded corners.
      */}
      <div 
        id={id}
        className={`relative flex flex-col justify-end text-white rounded-xl overflow-hidden transform-origin-top-left bg-black ${currentStyle.container}`}
        style={{ backgroundColor: config.overlayColor }}
      >
        {/* Background Image */}
        <div className="absolute inset-0 z-0 overflow-hidden">
            <img 
                src={data.backgroundUrl} 
                alt="Background" 
                crossOrigin="anonymous"
                className="w-full h-full object-cover transition-all duration-700 min-w-full min-h-full scale-[1.02]"
            />
        </div>
        
        {/* Dark Safety Gradient */}
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />

        {/* Dynamic User Colored Gradient Overlays */}
        <div className="absolute inset-0 z-10" style={gradientOverlayStyle} />
        <div className="absolute inset-0 z-10" style={gradientSideStyle} />

        {/* Geometric Decoration */}
        <div className="absolute inset-0 z-15 overflow-hidden">
             {renderDecoration(config.decoration)}
        </div>
        
        {/* Content Container */}
        <div className={`relative z-30 flex flex-col items-start w-full ${currentStyle.padding} ${currentStyle.layoutGap}`}>
            
            {/* Top Row: Badges, BPM */}
            <div className={`flex items-center gap-2 mb-auto min-h-[20px] flex-wrap pb-2`}>
                {config.showStatus && (
                    <span 
                        className={`${currentStyle.badgeSize} text-white font-bold uppercase tracking-widest rounded-full shadow-lg backdrop-blur-sm`}
                        style={{ ...accentBgStyle, boxShadow: `0 2px 8px -1px ${config.accentColor}55` }}
                    >
                        {data.status}
                    </span>
                )}
                
                {config.showBpm && (
                    <span className={`${currentStyle.badgeSize} bg-white/5 text-white/80 font-bold uppercase tracking-widest rounded-full backdrop-blur-md border border-white/10`}>
                        {Math.round(data.bpm)} BPM
                    </span>
                )}
            </div>

            {/* Custom Text (Subtitle/Supertitle) */}
            {config.customText && (
                <div 
                    className={`${currentStyle.customTextSize} font-bold uppercase text-white/90 drop-shadow-md ${fontClass} mt-1`}
                    style={accentStyle}
                >
                    {config.customText}
                </div>
            )}

            {/* Title */}
            <h1 className={`${currentStyle.titleSize} ${currentStyle.titleMargin} font-black text-white ${fontClass} tracking-tight drop-shadow-xl leading-none max-w-full line-clamp-1`}>
                {data.title}
            </h1>
            
            {/* Artist */}
            <h2 
                className={`${currentStyle.artistSize} font-medium ${fontClass} tracking-wide drop-shadow-lg max-w-full line-clamp-1 leading-none`}
                style={{ color: `${config.accentColor}dd` }} 
            >
                {data.artist}
            </h2>

            {/* Divider */}
            <div 
                className={`${currentStyle.dividerHeight} ${currentStyle.dividerMargin} rounded-full`}
                style={{ 
                    ...accentBgStyle, 
                    boxShadow: `0 0 10px ${config.accentColor}80` 
                }}
            ></div>

            {/* Footer Info */}
            <div className="flex items-end justify-between w-full">
                <div className="flex flex-col">
                    <span className={`text-gray-400 font-semibold uppercase tracking-wider mb-0.5 ${currentStyle.mapperLabelSize}`}>Mapped by</span>
                    <div className="flex items-baseline gap-2">
                        <span className={`${currentStyle.mapperSize} font-bold text-white tracking-wide pb-0.5`}>{data.mapper}</span>
                        {selectedDiff && (
                             <span className={`${currentStyle.mapperLabelSize} text-white/70 font-medium tracking-wide border-l border-white/20 pl-2`}>
                                {selectedDiff.version}
                             </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
        
      </div>
    </div>
  );
};

export default BannerPreview;
