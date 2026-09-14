const fs = require('fs');
let c = fs.readFileSync('frontend/src/App.tsx', 'utf8');

const regex = /const handleViewChange = \(view: string\) => \{\s*setActiveView\(view as any\);\s*\};/;
const replacement = `const handleViewChange = (view: string) => {
    window.history.pushState({ view }, '', \`/#\${view}\`);
    setActiveView(view as any);
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
  }, [currentUser]);`;

c = c.replace(regex, replacement);
fs.writeFileSync('frontend/src/App.tsx', c);
