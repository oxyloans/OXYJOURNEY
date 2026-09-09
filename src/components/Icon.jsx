const paths = {
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  compass: <><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8 4.8-2.2Z"/></>,
  coins: <><ellipse cx="8" cy="7" rx="4.5" ry="2.5"/><path d="M3.5 7v4c0 1.4 2 2.5 4.5 2.5s4.5-1.1 4.5-2.5V7M12.5 10c2.6.1 4.5 1.1 4.5 2.5 0 1.4-2 2.5-4.5 2.5-.7 0-1.4-.1-2-.2M8 13.5v3c0 1.4 2 2.5 4.5 2.5s4.5-1.1 4.5-2.5v-4"/></>,
  borrower: <><path d="M4 19h16M6 16V8l6-4 6 4v8"/><path d="M9 16v-5h6v5"/></>,
  scale: <><path d="M12 3v18M7 6h10M6 6l-3 6h6L6 6Zm12 0-3 6h6l-3-6Z"/><path d="M4 12c.5 2 3.5 2 4 0M16 12c.5 2 3.5 2 4 0"/></>,
  briefcase: <><rect x="4" y="7" width="16" height="12" rx="2"/><path d="M9 7V5h6v2M4 12h16M10 12v2h4v-2"/></>,
  handshake: <><path d="m8 12 3 3c.8.8 2 .8 2.8 0l5.7-5.7a2 2 0 0 0 0-2.8l-1-1a2 2 0 0 0-2.8 0L13 8.2"/><path d="m11 8-2.2-2.2a2 2 0 0 0-2.8 0L3.5 8.3a2 2 0 0 0 0 2.8L8 15.6M6 13l-1 1M9 16l-1 1M12 17l-1 1"/></>,
  search: <><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></>,
  check: <path d="m5 12 4 4L19 6" />,
  route: <><circle cx="6" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 6h4a4 4 0 0 1 4 4v0a4 4 0 0 1-4 4H9a3 3 0 0 0-3 3v0"/></>,
  spark: <><path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4L12 3Z"/><path d="m18 13 .8 2.2L21 16l-2.2.8L18 19l-.8-2.2L15 16l2.2-.8L18 13Z"/></>,
  shield: <><path d="M12 3 5 6v5c0 4.5 3 7.8 7 10 4-2.2 7-5.5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></>,
  phone: <><rect x="7" y="3" width="10" height="18" rx="2"/><path d="M10 6h4M11 18h2"/></>,
  grid: <><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/></>,
  chevron: <path d="m8 10 4 4 4-4" />,
  external: <><path d="M14 5h5v5M19 5l-8 8"/><path d="M17 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h5"/></>,
};

export default function Icon({ name, size = 20, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name] || paths.spark}
    </svg>
  );
}
