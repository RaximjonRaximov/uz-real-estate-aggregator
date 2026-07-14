declare module 'react-globe.gl' {
  import { Component } from 'react';

  interface GlobeProps {
    width?: number;
    height?: number;
    globeImageUrl?: string;
    backgroundImageUrl?: string;
    backgroundColor?: string;
    atmosphereColor?: string;
    atmosphereAltitude?: number;

    pointsData?: any[];
    pointLat?: string | ((d: any) => number);
    pointLng?: string | ((d: any) => number);
    pointLabel?: string | ((d: any) => string);
    pointColor?: string | ((d: any) => string);
    pointRadius?: string | number | ((d: any) => number);
    pointAltitude?: string | number | ((d: any) => number);

    arcsData?: any[];
    arcStartLat?: string | ((d: any) => number);
    arcStartLng?: string | ((d: any) => number);
    arcEndLat?: string | ((d: any) => number);
    arcEndLng?: string | ((d: any) => number);
    arcColor?: string | ((d: any) => string);
    arcStroke?: number | ((d: any) => number);
    arcDashLength?: number;
    arcDashGap?: number;
    arcDashAnimateTime?: number;

    hexBinPointsData?: any[];
    hexBinPointLat?: string | ((d: any) => number);
    hexBinPointLng?: string | ((d: any) => number);
    hexBinResolution?: number;
    hexBinColor?: string | ((d: any) => string);

    [key: string]: any;
  }

  export default class Globe extends Component<GlobeProps> {}
}
