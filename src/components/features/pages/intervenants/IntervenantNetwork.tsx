import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as d3 from 'd3';
import * as Items from '@/services/Items';
import { ZoomInIcon, ZoomOutIcon, UserIcon } from '@/components/ui/icons';

interface IntervenantNetworkProps {
  currentActantId: string;
}

interface NetworkNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  picture?: string;
  similarity: number; // 0 to 1
  type: 'current' | 'neighbor';
  r?: number; // visual radius
  orbitIndex?: number; // Solar system orbit index
  sharedKeywords?: number;
  details?: {
      k: number; // Keywords score
      u: number; // Unis score
      l: number; // Labs score
      s: number; // Schools score
      e: number; // Events score
      r: number; // Refs score
      sharedEventsCount: number;
      sharedRefsCount: number;
  };
}

interface NetworkLink extends d3.SimulationLinkDatum<NetworkNode> {
  value: number; // weight
  source: string | NetworkNode;
  target: string | NetworkNode;
}

export const IntervenantNetwork: React.FC<IntervenantNetworkProps> = ({ currentActantId }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [dimensions, setDimensions] = useState({ width: 750, height: 750 });

  const [loading, setLoading] = useState(true);
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [links, setLinks] = useState<NetworkLink[]>([]);
  const [hoveredNode, setHoveredNode] = useState<NetworkNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [zoomLevel, setZoomLevel] = useState(1.1); // 1.1 = Slightly zoomed in

  // Fetch Network Data
  useEffect(() => {
    const fetchData = async () => {
      if (!currentActantId) return;
      
      setLoading(true);
      try {
        const data = await Items.getActantNetwork(currentActantId);
        
        if (data && data.nodes && data.nodes.length > 0) {
            setNodes(data.nodes);
            setLinks(data.links || []);
        } else {
            console.log('No network data found for', currentActantId);
            setNodes([]);
            setLinks([]);
        }
      } catch (error) {
        console.error("Graph Data Error:", error);
        setNodes([]); 
        setLinks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentActantId]);

  // Observe Container Dimensions
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);


  // Render Solar System Graph
  useEffect(() => {
    if (loading || nodes.length === 0 || !svgRef.current || dimensions.width === 0 || dimensions.height === 0) return;

    // Use actual container dimensions for calculating viewbox
    const viewWidth = dimensions.width / zoomLevel;
    const viewHeight = dimensions.height / zoomLevel;

    d3.select(svgRef.current).selectAll("*").remove();
    const svg = d3.select(svgRef.current)
      .attr("viewBox", [-viewWidth / 2, -viewHeight / 2, viewWidth, viewHeight]);

    // Background Orbit Rings - Wider Spacing
    const orbits = [160, 290, 420]; 
    svg.append("g")
       .selectAll("circle")
       .data(orbits)
       .join("circle")
       .attr("r", d => d)
       .attr("fill", "none")
       .attr("class", "stroke-c6 opacity-20") // Theme color with opacity
       .attr("stroke-dasharray", "4 4");

    // Defs for Images
    const defs = svg.append('defs');
    nodes.forEach(node => {
       if (node.picture) {
           defs.append('pattern')
             .attr('id', `img-${node.id}`)
             .attr('width', 1)
             .attr('height', 1)
             .append('image')
             .attr("href", node.picture)
             .attr("width",  node.type === 'current' ? 120 : 60)
             .attr("height", node.type === 'current' ? 120 : 60)
             .attr("preserveAspectRatio", "xMidYMid slice");
       }
    });

    // Solar Force Simulation
    const simulation = d3.forceSimulation(nodes)
        .force("charge", d3.forceManyBody().strength(-300))
        .force("collide", d3.forceCollide().radius((d: any) => (d.type === 'current' ? 60 : 30) + 15))
        .force("radial", d3.forceRadial(
            (d: any) => {
                if (d.type === 'current') return 0;
                if (d.orbitIndex !== undefined && d.orbitIndex >= 0 && d.orbitIndex < orbits.length) {
                    return orbits[d.orbitIndex];
                }
                return orbits[2];
            }, 
            0, 0
        ).strength(0.8));

    // Render Nodes
    const node = svg.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
        .attr("cursor", "pointer")
        .call(drag(simulation) as any)
        .on("click", (_, d) => {
             window.scrollTo(0, 0);
             navigate(`/intervenant/${d.id}`);
        })
        .on("mouseenter", (event, d) => {
             if (d.type === 'neighbor') {
                 setHoveredNode(d);
                 // Calculate position based on DOM element to be robust against zooms/viewBox
                 if (containerRef.current && event.currentTarget) {
                     const targetRect = (event.currentTarget as Element).getBoundingClientRect();
                     const containerRect = containerRef.current.getBoundingClientRect();
                     setTooltipPos({
                         x: targetRect.left - containerRect.left + targetRect.width / 2,
                         y: targetRect.top - containerRect.top
                     });
                 }
             }
        })
        .on("mouseleave", () => {
             setHoveredNode(null);
        });

    node.append("circle")
        .attr("r", d => d.type === 'current' ? 45 : 28)
        .attr("fill", d => d.picture ? `url(#img-${d.id})` : "#333333")
        .attr("stroke", d => {
            if (d.type === 'current') return "#9353d3";
            if ((d.similarity || 0) > 0.5) return "#ffffff";
            return "#c7c7c7ff";
        })
        .attr("stroke-width", d => d.type === 'current' ? 2 : (d.similarity > 0.5 ? 2 : 1));

    const iconGroup = node.filter(d => !d.picture)
        .append("g")
        .attr("transform", d => {
             const targetSize = d.type === 'current' ? 48 : 30;
             const scale = targetSize / 22;
             return `scale(${scale}) translate(-11, -11)`;
        })
        .attr("fill", "#aaaaaa")
        .style("pointer-events", "none");

    iconGroup.append("path")
        .attr("d", "M11.0005 0C8.19947 0 5.92233 2.3431 5.92233 5.22522C5.92233 8.05234 8.07118 10.3404 10.8722 10.4394C10.9577 10.4284 11.0432 10.4284 11.1074 10.4394C11.1288 10.4394 11.1394 10.4394 11.1608 10.4394C11.1715 10.4394 11.1715 10.4394 11.1822 10.4394C13.9191 10.3404 16.0679 8.05234 16.0786 5.22522C16.0786 2.3431 13.8015 0 11.0005 0Z");
    
    iconGroup.append("path")
        .attr("d", "M16.4318 13.3646C13.4491 11.3185 8.58482 11.3185 5.5807 13.3646C4.22297 14.2997 3.47461 15.5647 3.47461 16.9178C3.47461 18.2708 4.22297 19.5249 5.57001 20.4489C7.06672 21.483 9.03379 22 11.0009 22C12.968 22 14.9351 21.483 16.4318 20.4489C17.7789 19.5139 18.5272 18.2598 18.5272 16.8958C18.5166 15.5427 17.7789 14.2887 16.4318 13.3646Z");

    node.append("text")
        .attr("dy", d => d.type === 'current' ? 65 : 45)
        .attr("text-anchor", "middle")
        .text(d => d.name)
        .attr("class", "fill-c6") // Theme color
        .attr("font-size", d => d.type === 'current' ? "14px" : "11px")
        .attr("font-weight", d => d.type === 'current' ? "bold" : "normal")
        .style("pointer-events", "none");

    simulation.on("tick", () => {
      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });
    
    return () => { simulation.stop(); };

  }, [nodes, links, loading, zoomLevel, dimensions, navigate]); // Re-render on zoom or dimension change; navigate stable from react-router


  const drag = (simulation: d3.Simulation<NetworkNode, undefined>) => {
    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }
    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }
    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }
    return d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended);
  }

  if (loading) return (
    <div className='w-full h-[600px] rounded-3xl bg-c3/50 animate-pulse' />
  );
  if (nodes.length < 2) return null;

  return (
    <div ref={containerRef} className="relative h-[750px] w-full bg-c1 rounded-xl border border-c3 group">
      <svg 
        ref={svgRef} 
        className="w-full h-full transition-transform duration-300 ease-out"
        style={{
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)'
        }}
      ></svg>
      
      {/* Zoom Controls (Bottom Right) */}
      <div className='absolute bottom-1.5 right-1.5 flex z-20'>
        <div className='flex flex-col gap-2'>
          <button
            className="focus:outline-none focus-visible:outline-none hover:bg-c3 cursor-pointer bg-c2 text-base p-2.5 border-c3 border-2 rounded-xl text-c6 transition-colors ease-in-out duration-200"
            onClick={() => setZoomLevel(z => Math.max(0.6, z - 0.2))}
            title="Dézoomer"
          >
            <ZoomOutIcon size={20} className="text-c6" />
          </button>
          <button
            className="focus:outline-none focus-visible:outline-none hover:bg-c3 cursor-pointer bg-c2 text-base p-2.5 border-c3 border-2 rounded-xl text-c6 transition-colors ease-in-out duration-200"
            onClick={() => setZoomLevel(z => Math.min(2.0, z + 0.2))}
            title="Zoomer"
          >
            <ZoomInIcon size={20} className="text-c6" />
          </button>
        </div>
      </div>

      {hoveredNode && hoveredNode.details && (
        <div 
             className="absolute w-64 p-2.5 bg-c2 rounded-2xl border border-c3 shadow-xl z-20 flex flex-col gap-3 animate-fade-in pointer-events-none -translate-x-1/2 -translate-y-[calc(100%+20px)] shadow-[inset_0_0px_15px_rgba(255,255,255,0.05)] border-c3 border-2"
             style={{
                 left: tooltipPos.x,
                 top: tooltipPos.y
             }}
        >
           {/* Header with Avatar and Name */}
           <div className='bg-c3 p-2.5 rounded-xl flex flex-row items-center gap-3'>
              {hoveredNode.picture ? (
                <img src={hoveredNode.picture} alt='Avatar' className='w-10 h-10 shrink-0 rounded-lg object-cover bg-c1' />
              ) : (
                <div className='w-10 h-10 shrink-0 rounded-lg bg-c1 flex items-center justify-center'>
                  <UserIcon size={22} className='text-c6' />
                </div>
              )}
              <div className="flex flex-col gap-px">
                  <span className='text-base font-normal text-c6 leading-tight'>{hoveredNode.name}</span>
                  <span className='text-xs text-c5 font-medium'>Proximité de {Math.round(hoveredNode.similarity * 100)}%</span>
              </div>
           </div>

           {/* Metrics List */}
           <div className="flex flex-col gap-2.5 px-1.5">
               
               {hoveredNode.details.sharedEventsCount > 0 && (
                   <div className="flex justify-between items-center">
                       <span className="text-sm text-c5">Évènements communs</span>
                       <span className="text-sm text-c6 font-medium">{hoveredNode.details.sharedEventsCount}</span>
                   </div>
               )}
                {hoveredNode.details.sharedRefsCount > 0 && (
                   <div className="flex justify-between items-center">
                       <span className="text-sm text-c5">Références partagées</span>
                       <span className="text-sm text-c6 font-medium">{hoveredNode.details.sharedRefsCount}</span>
                   </div>
               )}

               {(hoveredNode.details.sharedEventsCount > 0 || hoveredNode.details.sharedRefsCount > 0) && (
                   <div className="h-[1px] bg-c3 w-full my-1.5"></div>
               )}

               <div className="flex justify-between items-center">
                   <span className="text-sm text-c5">Thématiques</span>
                   <span className="text-sm text-c6 font-medium">{Math.round(hoveredNode.details.k * 100)}%</span>
               </div>
               <div className="flex justify-between items-center">
                   <span className="text-sm text-c5">Institutionnelle</span>
                   <span className="text-sm text-c6 font-medium">{Math.round(((hoveredNode.details.u + hoveredNode.details.l + hoveredNode.details.s) / 3) * 100)}%</span>
               </div>
           </div>
        </div>
      )}
    </div>
  );
};
