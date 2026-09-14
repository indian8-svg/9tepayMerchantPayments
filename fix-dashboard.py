import re
with open("frontend/src/components/MerchantDashboard.tsx", "r", encoding="utf-8") as f:
    c = f.read()

replacement = """<span>Invoices</span>
            </button>

            <button
              onClick={() => setActiveTab(\"subscriptions\")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === \"subscriptions\"
                  ? \"bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs\"
                  : \"text-slate-600 hover:text-slate-900 hover:bg-slate-100\"
              }`}
            >
              <Repeat className=\"w-3.5 h-3.5\" />
              <span>Subscriptions</span>
            </button>

            <button
              onClick={() => setActiveTab(\"routing\")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === \"routing\"
                  ? \"bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs\"
                  : \"text-slate-600 hover:text-slate-900 hover:bg-slate-100\"
              }`}
            >
              <Route className=\"w-3.5 h-3.5\" />
              <span>Routing Rules</span>
            </button>"""

c = re.sub(r"<span>Invoices</span>\s*</button>", replacement, c)

with open("frontend/src/components/MerchantDashboard.tsx", "w", encoding="utf-8") as f:
    f.write(c)

