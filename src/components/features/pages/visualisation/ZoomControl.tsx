import { FC, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { CenterIcon, ZoomInIcon, ZoomOutIcon } from '@/components/ui/icons';
import { Button } from '@heroui/react';

interface ZoomControlProps {
  svgRef: React.RefObject<SVGSVGElement>;
  availableControl: boolean;
}

const ZoomControl: FC<ZoomControlProps> = ({ svgRef, availableControl }) => {
  const zoomBehavior = useRef(d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.25, 4]).on('zoom', handleZoom));

  useEffect(() => {
    if (svgRef.current) {
      const svg = d3.select<SVGSVGElement, unknown>(svgRef.current);

      if (svg.select('.zoom-group').empty()) {
        svg.append('g').attr('class', 'zoom-group');
      }

      svg.call(zoomBehavior.current);

      const existingElements = svg.selectAll('g:not(.zoom-group)');
      if (!existingElements.empty()) {
        const zoomGroup = svg.select('.zoom-group');
        existingElements.each(function () {
          const element = d3.select(this);
          if (element.attr('class') !== 'zoom-group') {
            const node = zoomGroup.node();
            if (node && node instanceof Element) {
              const currentNode = this as Node;
              node.appendChild(currentNode);
            }
          }
        });
      }
    }
  }, [svgRef]);

  function handleZoom(e: d3.D3ZoomEvent<SVGSVGElement, unknown>) {
    if (!svgRef.current) return;

    const transform = e.transform;
    d3.select<SVGSVGElement, unknown>(svgRef.current).select('.zoom-group').attr('transform', transform.toString());

    // Ajout de la logique pour mettre à jour le texte en fonction du zoom
    updateTextDisplayWithZoom(transform.k);
  }
  // Fonction améliorée pour ajuster la taille du texte et le nombre de caractères
  function updateTextDisplayWithZoom(scale: number) {
    const BASE_CHARACTER_LIMIT = 10;
    const MAX_WIDTH = 150; // Largeur maximale en pixels
    const LINE_HEIGHT = 1.2; // Hauteur de ligne relative

    // Plus le zoom est grand, plus on affiche de caractères
    const newCharacterLimit = Math.floor(BASE_CHARACTER_LIMIT * Math.pow(scale, 3.5));

    d3.selectAll('.node-text').each(function (d: any) {
      if (!d || !d.fullTitle) return;

      const fullTitle = d.fullTitle;
      const textElement = d3.select(this);
      const nodeType = d.type;

      // Sauvegarder les coordonnées originales du texte
      const x = textElement.attr('x') || 0;
      // const y = textElement.attr('y') || 0;

      // Récupérer la taille de base pour ce type de nœud
      const baseFontSize = getSizeForType(nodeType);
      const baseFontSizeValue = parseInt(baseFontSize);
      const baseFontSizeUnit = baseFontSize.replace(/[0-9]/g, '');

      // Calculer la nouvelle taille de police
      const newFontSize = `${baseFontSizeValue / Math.pow(scale, 1.1)}${baseFontSizeUnit}`;

      // Effacer le contenu actuel
      textElement.html('');

      // Appliquer la nouvelle taille de police
      textElement.attr('font-size', newFontSize);

      // Configurer l'ancrage du texte au milieu
      textElement.attr('text-anchor', 'middle');

      // Calculer le texte à afficher
      let displayText = fullTitle;
      if (fullTitle.length > newCharacterLimit) {
        displayText = `${fullTitle.substring(0, newCharacterLimit)}...`;
      }

      // Calculer le nombre maximal de caractères par ligne en fonction de la largeur
      const effectiveWidth = (MAX_WIDTH / scale) * 2.5;
      const charsPerLine = Math.max(5, Math.floor(effectiveWidth / ((baseFontSizeValue * 0.6) / scale)));

      // Découper le texte en lignes
      const words = displayText.split(' ');
      let line = '';

      // Calculer le nombre de lignes pour le centrage vertical
      const lines = [];
      words.forEach((word: string) => {
        const testLine = line + (line ? ' ' : '') + word;
        if (testLine.length > charsPerLine && line !== '') {
          lines.push(line);
          line = word;
        } else {
          line = testLine;
        }
      });
      if (line) lines.push(line);

      // Calculer le décalage vertical pour centrer le texte
      const totalLines = lines.length;
      const startY = totalLines > 1 ? (-(totalLines - 1) * LINE_HEIGHT) / 2 : 0;

      // Créer les tspans
      lines.forEach((lineText, i) => {
        textElement
          .append('tspan')
          .attr('x', x)
          .attr('dy', i === 0 ? `${startY}em` : `${LINE_HEIGHT}em`)
          .text(lineText);
      });
    });
  }

  // Fonction utilitaire pour obtenir la taille de police de base selon le type
  function getSizeForType(type: string) {
    const sizes: { [key: string]: string } = {
      conf: '18px',
      bibliography: '16px',
      actant: '18px',
      mediagraphie: '16px',
      citation: '16px',
      keyword: '14px',
      university: '14px',
      school: '14px',
      laboratory: '14px',
      collection: '18px',
    };
    return sizes[type] || '16px';
  }

  function zoomIn() {
    if (!svgRef.current) return;
    const svgElement = svgRef.current;

    d3.select<SVGSVGElement, unknown>(svgElement)
      .transition()
      .call(zoomBehavior.current.scaleBy, 1.5)
      .on('end', function () {
        // Vérifier que l'élément existe toujours avant d'appeler zoomTransform
        if (svgElement) {
          const currentTransform = d3.zoomTransform(svgElement);
          updateTextDisplayWithZoom(currentTransform.k);
        }
      });
  }

  function zoomOut() {
    if (!svgRef.current) return;
    const svgElement = svgRef.current;

    d3.select<SVGSVGElement, unknown>(svgElement)
      .transition()
      .call(zoomBehavior.current.scaleBy, 0.667)
      .on('end', function () {
        if (svgElement) {
          const currentTransform = d3.zoomTransform(svgElement);
          updateTextDisplayWithZoom(currentTransform.k);
        }
      });
  }

  function resetZoom() {
    if (!svgRef.current) return;
    const svgElement = svgRef.current;

    d3.select<SVGSVGElement, unknown>(svgElement)
      .transition()
      .call(zoomBehavior.current.transform, d3.zoomIdentity)
      .on('end', function () {
        // Réinitialise l'affichage du texte
        updateTextDisplayWithZoom(1);
      });
  }

  return (
    <div
      className={` rounded-xl p-2 bg-c2 flex flex-col shadow-lg gap-4 ${
        availableControl ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
      <Button
        size='md'
        className='cursor-pointer group text-base h-[40px] p-2.5 rounded-lg text-c6 bg-c2 hover:bg-action transition-all ease-in-out duration-200'
        onPress={zoomIn}>
        <ZoomInIcon size={20} className='text-c6 group-hover:text-selected transition-all ease-in-out duration-200' />
      </Button>
      <Button
        size='md'
        className='cursor-pointer group text-base h-[40px] p-2.5 rounded-lg text-c6 bg-c2 hover:bg-action transition-all ease-in-out duration-200'
        onPress={zoomOut}>
        <ZoomOutIcon size={20} className='text-c6 group-hover:text-selected transition-all ease-in-out duration-200' />
      </Button>
      <Button
        size='md'
        className='cursor-pointer group text-base h-[40px] p-2.5 rounded-lg text-c6 bg-c2 hover:bg-action transition-all ease-in-out duration-200'
        onPress={resetZoom}>
        <CenterIcon size={20} className='text-c6 group-hover:text-selected transition-all ease-in-out duration-200' />
      </Button>
    </div>
  );
};

export default ZoomControl;
