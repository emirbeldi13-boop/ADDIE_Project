import { Wifi, Volume2, Power, FileText, Coffee, Accessibility, Layout, Monitor, Projector, Tv, Wind, Printer } from 'lucide-react';

export const LOGISTICS_LABELS = {
  internet: { label: 'Accès Internet / Wi-Fi', icon: Wifi },
  sonorisation: { label: 'Sonorisation', icon: Volume2 },
  multiprises: { label: 'Multiprises / Rallonges', icon: Power },
  papeterie: { label: 'Kit papeterie (flipchart...)', icon: FileText },
  eau: { label: 'Point d\'eau / Café', icon: Coffee },
  pmr: { label: 'Accessibilité PMR', icon: Accessibility },
  tableau: { label: 'Tableau blanc', icon: Layout },
  interactif: { label: 'Tableau interactif', icon: Monitor },
  videoproj: { label: 'Vidéoprojecteur', icon: Projector },
  tv: { label: 'Téléviseur', icon: Tv },
  clim: { label: 'Climatisation', icon: Wind },
  photocopieuse: { label: 'Photocopieuse', icon: Printer }
};
