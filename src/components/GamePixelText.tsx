import { Devvit } from '@devvit/public-api';
import Glyphs from '../data/glyphs.json';

type SupportedGlyphs = keyof typeof Glyphs;

type Glyph = {
  path: string;
  width: number;
  height: number;
};

interface GamePixelTextProps {
  children: string | string[]; // Text content
  scale?: number;              // Text scaling factor
  color?: string;              // Text color
}

// Helper function to create a glyph path
function createGlyph(character: string, xOffset: number, color: string): string {
  const glyph: Glyph = Glyphs[character as SupportedGlyphs];
  if (!glyph) return ''; // Skip unsupported characters

  return `<path
      d="${glyph.path}"
      transform="translate(${xOffset} 0)"
      fill="${color}"
      fill-rule="evenodd"
      clip-rule="evenodd"
    />`;
}

// Main PixelText component
export function GamePixelText(props: GamePixelTextProps): JSX.Element {
  const { children, scale = 2, color = "#000000" } = props;

  const textLine = typeof children === 'string' ? children : children[0]; // Normalize to a single string
  const gap = 1; // Space between glyphs
  const glyphHeight = Glyphs['A'].height;

  let width = 0;      // Total width of the text
  let xOffset = 0;    // X offset for each glyph
  const characters: string[] = []; // Array of glyph SVG paths

  // Process each character in the text
  textLine.split('').forEach((character) => {
    if (character === ' ') {
      xOffset += 6 + gap; // Add space for blank space
    } else {
      const glyphPath = createGlyph(character, xOffset, color);
      if (glyphPath) {
        characters.push(glyphPath);
        xOffset += Glyphs[character as SupportedGlyphs]?.width + gap;
        width = xOffset; // Update total width
      }
    }
  });

  // Adjust for the trailing gap
  width -= gap;

  // Scale the dimensions
  const scaledHeight: Devvit.Blocks.SizeString = `${glyphHeight * scale}px`;
  const scaledWidth: Devvit.Blocks.SizeString = `${width * scale}px`;

  // Return the rendered SVG wrapped in an <image> block
  return (
    <image
      imageHeight={scaledHeight}
      imageWidth={scaledWidth}
      height={scaledHeight}
      width={scaledWidth}
      description={textLine} // Accessibility
      resizeMode="fill"
      url={`data:image/svg+xml,
        <svg
          width="${width}"
          height="${glyphHeight}"
          viewBox="0 0 ${width} ${glyphHeight}"
          xmlns="http://www.w3.org/2000/svg"
        >
          ${characters.join('')}
        </svg>
      `}
    />
  );
}
