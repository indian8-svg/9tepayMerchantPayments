const fs = require('fs');
let c = fs.readFileSync('frontend/src/App.tsx', 'utf8');

const regex = /React\.useEffect\(\(\) => \{\s*const handlePopState =[\s\S]*?\}, \[currentUser\]\);/;
const replacement = `React.useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      let view = e.state?.view;
      if (!view) {
        const hash = window.location.hash.replace('#', '');
        view = hash || (currentUser ? 'dashboard' : 'about');
      }
      
      // Prevent going back to the login page if already logged in
      if (currentUser && ['auth', 'about', 'login'].includes(view)) {
        window.history.replaceState({ view: currentUser.role === 'admin' ? 'admin' : 'dashboard' }, '', '/#' + (currentUser.role === 'admin' ? 'admin' : 'dashboard'));
        setActiveView(currentUser.role === 'admin' ? 'admin' : 'dashboard');
      } else if (['dashboard', 'payment_links', 'checkout', 'invoice', 'admin', 'auth', 'docs', 'profile', 'settings', 'about', 'contact'].includes(view)) {
        setActiveView(view as any);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser]);`;

c = c.replace(regex, replacement);
fs.writeFileSync('frontend/src/App.tsx', c);
