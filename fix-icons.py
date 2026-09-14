import re
with open("frontend/src/components/MerchantDashboard.tsx", "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace("EyeOff,", "EyeOff, FileText, Repeat, Route,")
with open("frontend/src/components/MerchantDashboard.tsx", "w", encoding="utf-8") as f:
    f.write(c)

