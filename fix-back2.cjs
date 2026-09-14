const fs = require('fs');
let c = fs.readFileSync('frontend/src/App.tsx', 'utf8');

const regex = /const handleViewChange = \([\s\S]*?setActiveView\(newView\);[\s\S]*?\}\s*\};\s*const handleLogoClick/m;
const replacement = `const handleViewChange = (
    newView: 'dashboard' | 'payment_links' | 'checkout' | 'admin' | 'auth' | 'docs' | 'profile' | 'settings' | 'about' | 'contact' | 'invoice'
  ) => {
    setActiveView(newView as any);
    if (newView !== 'checkout' && window.history && window.history.pushState) {
      if (window.location.pathname.startsWith('/checkout/')) {
        window.history.pushState(null, '', '/#' + newView);
      } else {
        window.history.pushState({ view: newView }, '', '/#' + newView);
      }
    }
  };

  React.useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.view) {
        setActiveView(e.state.view);
      } else {
        const hash = window.location.hash.replace('#', '');
        if (!hash) {
          setActiveView(currentUser ? 'dashboard' : 'about');
        } else if (['dashboard', 'payment_links', 'checkout', 'invoice', 'admin', 'auth', 'docs', 'profile', 'settings', 'about', 'contact'].includes(hash)) {
          setActiveView(hash as any);
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser]);

  const handleLogoClick`;

c = c.replace(regex, replacement);
fs.writeFileSync('frontend/src/App.tsx', c);
