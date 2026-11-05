import React, { useState } from "react";
import { PartogramChartData } from "../../types/nursing.types";

interface PartographChartProps {
  data: PartogramChartData;
}

const PartographChart: React.FC<PartographChartProps> = ({ data }) => {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; title: string; value: string } | null>(null);

  // SVG Dimensions
  const svgWidth = 1000;
  const svgHeight = 650;
  
  // Margins & Areas
  const marginLeft = 80;
  const marginRight = 40;
  const chartWidth = svgWidth - marginLeft - marginRight;
  const hours = 24;
  const hourWidth = chartWidth / hours;

  // FHR Area (y: 20 to 170)
  const fhrTop = 20;
  const fhrHeight = 150;
  const fhrBottom = fhrTop + fhrHeight;
  const fhrMin = 80;
  const fhrMax = 200;

  const getFhrY = (bpm: number) => {
    const val = Math.max(fhrMin, Math.min(fhrMax, bpm));
    return fhrBottom - ((val - fhrMin) / (fhrMax - fhrMin)) * fhrHeight;
  };

  // Cervicograph Area (y: 220 to 520)
  const cvxTop = 220;
  const cvxHeight = 300;
  const cvxBottom = cvxTop + cvxHeight;

  const getCvxY = (val: number) => {
    return cvxBottom - (val / 10) * cvxHeight;
  };

  // Contractions Area (y: 550 to 620)
  const ctxTop = 550;
  const ctxHeight = 70;
  const ctxBottom = ctxTop + ctxHeight;

  const getX = (hour: number) => {
    return marginLeft + (hour - 1) * hourWidth + (hourWidth / 2);
  };

  const fhrPoints = data.fetal_heart_rate
    .map(d => `${getX(d.x)},${getFhrY(Number(d.y))}`)
    .join(" ");

  const cvxPoints = data.cervical_dilation
    .map(d => ({ x: getX(d.x), y: getCvxY(Number(d.y)), hour: d.x, val: d.y }));

  const descPoints = data.fetal_descent
    .map(d => {
      const valMatch = String(d.y).match(/(\d)/);
      const val = valMatch ? Number(valMatch[1]) : 0;
      return { x: getX(d.x), y: getCvxY(val), hour: d.x, val: d.y };
    });

  return (
    <div className="w-full overflow-x-auto bg-white rounded-lg p-2 border border-slate-200 shadow-inner">
      <div style={{ minWidth: "800px" }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto text-slate-800 font-sans"
        >
          {/* Background Grids */}
          <g className="fhr-grid">
            {[...Array(13)].map((_, i) => {
              const val = fhrMin + i * 10;
              const y = getFhrY(val);
              return (
                <g key={`fhr-h-${i}`}>
                  <line x1={marginLeft} y1={y} x2={svgWidth - marginRight} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                  {i % 2 === 0 && (
                    <text x={marginLeft - 10} y={y + 4} textAnchor="end" fontSize="10" fill="#64748b">
                      {val}
                    </text>
                  )}
                </g>
              );
            })}
            <text x={marginLeft - 40} y={fhrTop + fhrHeight / 2} textAnchor="middle" transform={`rotate(-90, ${marginLeft - 40}, ${fhrTop + fhrHeight / 2})`} fontSize="12" fontWeight="bold" fill="#475569">
              Fetal Heart Rate
            </text>
          </g>

          <g className="cvx-grid">
            {[...Array(11)].map((_, i) => {
              const y = getCvxY(i);
              return (
                <g key={`cvx-h-${i}`}>
                  <line x1={marginLeft} y1={y} x2={svgWidth - marginRight} y2={y} stroke={i === 3 || i === 4 ? "#cbd5e1" : "#e2e8f0"} strokeWidth={i === 3 || i === 4 ? "2" : "1"} />
                  <text x={marginLeft - 10} y={y + 4} textAnchor="end" fontSize="10" fill="#64748b">
                    {i}
                  </text>
                  <text x={svgWidth - marginRight + 10} y={y + 4} textAnchor="start" fontSize="10" fill="#64748b">
                    {i <= 5 ? i : ""}
                  </text>
                </g>
              );
            })}
            <text x={marginLeft - 40} y={cvxTop + cvxHeight / 2} textAnchor="middle" transform={`rotate(-90, ${marginLeft - 40}, ${cvxTop + cvxHeight / 2})`} fontSize="12" fontWeight="bold" fill="#475569">
              Cervix (cm) / Descent
            </text>

            <line 
              x1={getX(8)} y1={getCvxY(3)} 
              x2={getX(15)} y2={getCvxY(10)} 
              stroke="#ef4444" strokeWidth="2" strokeDasharray="5,5" 
            />
            <text x={getX(11.5) - 10} y={getCvxY(6.5) - 10} fontSize="12" fill="#ef4444" fontWeight="bold" transform={`rotate(-40, ${getX(11.5)}, ${getCvxY(6.5)})`}>
              Alert
            </text>
            
            <line 
              x1={getX(12)} y1={getCvxY(3)} 
              x2={getX(19)} y2={getCvxY(10)} 
              stroke="#b91c1c" strokeWidth="2" 
            />
            <text x={getX(15.5) - 10} y={getCvxY(6.5) - 10} fontSize="12" fill="#b91c1c" fontWeight="bold" transform={`rotate(-40, ${getX(15.5)}, ${getCvxY(6.5)})`}>
              Action
            </text>
          </g>

          <g className="ctx-grid">
            {[...Array(6)].map((_, i) => {
              const y = ctxBottom - (i / 5) * ctxHeight;
              return (
                <g key={`ctx-h-${i}`}>
                  <line x1={marginLeft} y1={y} x2={svgWidth - marginRight} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                  <text x={marginLeft - 10} y={y + 4} textAnchor="end" fontSize="10" fill="#64748b">
                    {i}
                  </text>
                </g>
              );
            })}
            <text x={marginLeft - 40} y={ctxTop + ctxHeight / 2} textAnchor="middle" transform={`rotate(-90, ${marginLeft - 40}, ${ctxTop + ctxHeight / 2})`} fontSize="12" fontWeight="bold" fill="#475569">
              Contractions
            </text>
          </g>

          {[...Array(hours + 1)].map((_, i) => {
            const x = marginLeft + i * hourWidth;
            return (
              <g key={`v-line-${i}`}>
                <line x1={x} y1={fhrTop} x2={x} y2={ctxBottom} stroke="#cbd5e1" strokeWidth="1" />
                {i < hours && (
                  <text x={x + hourWidth / 2} y={ctxBottom + 20} textAnchor="middle" fontSize="11" fill="#475569" fontWeight="bold">
                    {i + 1}
                  </text>
                )}
              </g>
            );
          })}
          <text x={svgWidth / 2} y={ctxBottom + 40} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#475569">
            Hours of Labour
          </text>

          {/* --- Plotting Data --- */}
          
          {/* FHR Line */}
          {data.fetal_heart_rate.length > 0 && (
            <g className="fhr-data">
              <polyline points={fhrPoints} fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="2000" strokeDashoffset="2000">
                <animate attributeName="stroke-dashoffset" from="2000" to="0" dur="1.5s" fill="freeze" />
              </polyline>
              {data.fetal_heart_rate.map((d, i) => {
                const cx = getX(d.x);
                const cy = getFhrY(Number(d.y));
                return (
                  <circle 
                    key={`fhr-c-${i}`} cx={cx} cy={cy} r="6" fill="#2563eb" 
                    className="cursor-pointer hover:stroke-white hover:stroke-2 transition-all"
                    opacity="0"
                    onMouseEnter={() => setTooltip({ x: cx, y: cy, title: "Fetal Heart Rate", value: `${d.y} bpm at Hour ${d.x}` })}
                    onMouseLeave={() => setTooltip(null)}
                  >
                    <animate attributeName="opacity" from="0" to="1" dur="0.5s" begin={`${i * 0.15 + 0.5}s`} fill="freeze" />
                  </circle>
                );
              })}
            </g>
          )}

          {/* Cervical Dilation (Plot X) */}
          {cvxPoints.length > 1 && (
            <g opacity="0">
              <animate attributeName="opacity" from="0" to="1" dur="0.8s" begin="0.2s" fill="freeze" />
              <polyline 
                points={cvxPoints.map(p => `${p.x},${p.y}`).join(" ")} 
                fill="none" stroke="#eab308" strokeWidth="2" strokeDasharray="3,3" 
              />
            </g>
          )}
          {cvxPoints.map((pt, i) => (
            <g 
              key={`cvx-pt-${i}`} 
              transform={`translate(${pt.x}, ${pt.y})`} 
              className="cursor-pointer"
              opacity="0"
              onMouseEnter={() => setTooltip({ x: pt.x, y: pt.y, title: "Cervical Dilation", value: `${pt.val} cm at Hour ${pt.hour}` })}
              onMouseLeave={() => setTooltip(null)}
            >
              <animate attributeName="opacity" from="0" to="1" dur="0.5s" begin={`${i * 0.15 + 0.5}s`} fill="freeze" />
              <rect x="-8" y="-8" width="16" height="16" fill="transparent" />
              <line x1="-5" y1="-5" x2="5" y2="5" stroke="#eab308" strokeWidth="3" />
              <line x1="-5" y1="5" x2="5" y2="-5" stroke="#eab308" strokeWidth="3" />
            </g>
          ))}

          {/* Fetal Descent (Plot O) */}
          {descPoints.length > 1 && (
            <g opacity="0">
              <animate attributeName="opacity" from="0" to="1" dur="0.8s" begin="0.2s" fill="freeze" />
              <polyline 
                points={descPoints.map(p => `${p.x},${p.y}`).join(" ")} 
                fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="3,3" 
              />
            </g>
          )}
          {descPoints.map((pt, i) => (
            <g 
              key={`desc-pt-${i}`} 
              className="cursor-pointer"
              opacity="0"
              onMouseEnter={() => setTooltip({ x: pt.x, y: pt.y, title: "Fetal Descent", value: `${pt.val} fifths at Hour ${pt.hour}` })}
              onMouseLeave={() => setTooltip(null)}
            >
              <animate attributeName="opacity" from="0" to="1" dur="0.5s" begin={`${i * 0.15 + 0.5}s`} fill="freeze" />
              <circle cx={pt.x} cy={pt.y} r="8" fill="transparent" />
              <circle cx={pt.x} cy={pt.y} r="5" fill="none" stroke="#22c55e" strokeWidth="3" />
            </g>
          ))}

          {/* Contractions */}
          <g className="ctx-data">
            {data.contractions.map((d, i) => {
              const count = Number(d.y);
              if (count === 0) return null;
              const h = (count / 5) * ctxHeight;
              const y = ctxBottom - h;
              const cx = getX(d.x);
              return (
                <rect 
                  key={`ctx-rect-${i}`} 
                  x={cx - (hourWidth * 0.4)} 
                  y={y} 
                  width={hourWidth * 0.8} 
                  height={h} 
                  fill="#93c5fd" 
                  stroke="#3b82f6"
                  strokeWidth="1"
                  className="cursor-pointer hover:fill-blue-400 transition-colors"
                  opacity="0"
                  onMouseEnter={() => setTooltip({ x: cx, y: y, title: "Contractions", value: `${d.y}/10 mins at Hour ${d.x}` })}
                  onMouseLeave={() => setTooltip(null)}
                >
                  <animate attributeName="opacity" from="0" to="1" dur="0.6s" begin={`${i * 0.1}s`} fill="freeze" />
                </rect>
              );
            })}
          </g>

          {/* SVG Tooltip Overlay */}
          {tooltip && (
            <foreignObject 
              x={Math.min(tooltip.x + 10, svgWidth - 170)} 
              y={Math.max(tooltip.y - 50, 10)} 
              width="160" 
              height="70" 
              className="pointer-events-none transition-all duration-150"
            >
              <div className="bg-slate-800/95 backdrop-blur-sm text-white text-xs p-3 rounded-xl shadow-xl border border-slate-700 pointer-events-none flex flex-col gap-1">
                <span className="font-bold text-slate-300 uppercase tracking-wider text-[9px]">{tooltip.title}</span>
                <span className="font-medium text-sm leading-none">{tooltip.value}</span>
              </div>
            </foreignObject>
          )}
        </svg>
      </div>
    </div>
  );
};

export default PartographChart;
