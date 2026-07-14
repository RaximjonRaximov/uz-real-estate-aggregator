declare module 'react-globe.gl' {
  import { Component } from 'react';

  interface GlobeProps {
    globeImageUrl?: string;
    backgroundImageUrl?: string;
    pointsData?: any[];
    pointLat?: string | ((d: any) => number);
    pointLng?: string | ((d: any) => number);
    pointLabel?: string | ((d: any) => string);
    pointColor?: string | ((d: any) => string);
    pointRadius?: string | number | ((d: any) => number);
    pointAltitude?: string | number | ((d: any) => number);
    width?: number;
    height?: number;
    atmosphereColor?: string;
    atmosphereAltitude?: number;
    [key: string]: any;
  }

  export default class Globe extends Component<GlobeProps> {}
}
