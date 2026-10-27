"""Generate the service and location pages from the Our Story template.

Run from the repo root:  python3 tools/build_pages.py
Header, footer and scripts are copied from our-story.html so every page stays in sync.
"""
import json
import re

DOM = 'https://www.sloanfs.com'
AR = '<span aria-hidden="true">&rarr;</span>'
tpl = open('our-story.html').read()
PRE = tpl[:tpl.index('<main id="main">')].rstrip(' ') 
POST = tpl[tpl.index('    </main>') + len('    </main>'):]

ORG = {"@id": f"{DOM}/#burnsville"}
BURNS_ADDR = {"@type": "PostalAddress", "streetAddress": "12301 Nicollet Ave, Suite 101", "addressLocality": "Burnsville", "addressRegion": "MN", "postalCode": "55337", "addressCountry": "US"}
BARRON_ADDR = {"@type": "PostalAddress", "streetAddress": "421 E La Salle Ave, Suite A", "addressLocality": "Barron", "addressRegion": "WI", "postalCode": "54812", "addressCountry": "US"}
HOURS = {"@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "opens": "09:00", "closes": "16:30"}
MN = ['Burnsville', 'Apple Valley', 'Eagan', 'Savage', 'Prior Lake', 'Lakeville', 'Shakopee']
NW = ['Barron', 'Rice Lake', 'Cameron', 'Chetek', 'Spooner', 'Cumberland', 'Hayward']
SE = ['Milwaukee', 'New Berlin', 'Muskego', 'Franklin', 'Brookfield', 'West Allis']


def ld(obj):
    return '    <script type="application/ld+json">\n' + json.dumps(obj, indent=2, ensure_ascii=False) + '\n    </script>\n'


def breadcrumb(name, slug):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Home", "item": f"{DOM}/"},
        {"@type": "ListItem", "position": 2, "name": name, "item": f"{DOM}/{slug}"}]}


def faq_ld(faqs):
    return {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": re.sub('<[^>]+>', '', a)}} for q, a in faqs]}


def faq_html(eyebrow, title, faqs):
    items = ''.join(f'''            <details class="faq-item"{' open' if i == 0 else ''}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
''' for i, (q, a) in enumerate(faqs))
    return f'''      <section class="faq section">
        <div class="container faq-grid">
          <div class="faq-head">
            <p class="eyebrow">{eyebrow}</p>
            <h2>{title}</h2>
            <p>Don't see yours? Call <a href="tel:9524328000">(952) 432-8000</a>.</p>
          </div>
          <div class="faq-list">
{items}          </div>
        </div>
      </section>
'''


def crumbs(name):
    return f'<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span>{name}</span></nav>'


def cta(title, text):
    return f'''      <section class="story-cta section">
        <div class="container story-cta-inner">
          <div>
            <p class="eyebrow">Let's talk</p>
            <h2>{title}</h2>
            <p>{text}</p>
          </div>
          <div class="story-cta-actions">
            <a href="/#contact" class="button button-primary button-arrow">Schedule a conversation {AR}</a>
            <a href="tel:9524328000" class="text-cta">Or call (952) 432-8000 {AR}</a>
          </div>
        </div>
      </section>
'''


def detail_rows(rows):
    out = []
    for i, (rid, kicker, title, paras, checks, cta_text) in enumerate(rows):
        ps = ''.join(f'<p>{p}</p>' for p in paras)
        cl = ''.join(f'<li>{c}</li>' for c in checks)
        out.append(f'''          <article class="detail-row{' detail-row-flip' if i % 2 else ''}" id="{rid}">
            <div class="detail-copy">
              <span class="detail-num">{i + 1:02d}</span>
              <p class="eyebrow">{kicker}</p>
              <h2>{title}</h2>
              {ps}
              <a href="/#contact" class="text-cta">{cta_text} {AR}</a>
            </div>
            <aside class="detail-card">
              <p class="detail-card-title">What we look at together</p>
              <ul class="ticks">{cl}</ul>
            </aside>
          </article>
''')
    return '      <section class="details section">\n        <div class="container">\n' + ''.join(out) + '        </div>\n      </section>\n'


def page_hero(eyebrow, h1, lead, crumb, side):
    return f'''      <section class="story-hero page-hero">
        <img decoding="async" src="images/contours.svg" data-depth="-24" class="hero-contours" alt="" aria-hidden="true" width="900" height="700" />
        <div class="container story-hero-grid">
          <div class="story-hero-copy">
            {crumbs(crumb)}
            <p class="eyebrow">{eyebrow}</p>
            <h1>{h1}</h1>
            <p class="lead">{lead}</p>
            <div class="hero-actions">
              <a href="/#contact" class="button button-primary button-arrow">Schedule a conversation {AR}</a>
              <a href="tel:9524328000" class="text-cta">Or call (952) 432-8000 {AR}</a>
            </div>
          </div>
{side}
        </div>
      </section>
'''


def jump_card(title, links):
    li = ''.join(f'<li><a href="#{i}">{t} {AR}</a></li>' for i, t in links)
    return f'''          <aside class="jump-card">
            <p class="jump-title">{title}</p>
            <ul>{li}</ul>
          </aside>'''


def city_chips(cities):
    return '<ul class="chips">' + ''.join(f'<li>{c}</li>' for c in cities) + '</ul>'


def build(fname, slug, title, desc, crumb_name, body_class, schemas, main):
    head = PRE
    head = re.sub(r'<title>.*?</title>', f'<title>{title}</title>', head, flags=re.S)
    head = re.sub(r'<meta name="description" content="[^"]*" />', f'<meta name="description" content="{desc}" />', head)
    head = re.sub(r'<link rel="canonical" href="[^"]+" />', f'<link rel="canonical" href="{DOM}/{slug}" />', head)
    head = re.sub(r'<meta property="og:url" content="[^"]+" />', f'<meta property="og:url" content="{DOM}/{slug}" />', head)
    head = re.sub(r'<meta property="og:title" content="[^"]*" />', f'<meta property="og:title" content="{title}" />', head)
    head = re.sub(r'<meta property="og:description" content="[^"]*" />', f'<meta property="og:description" content="{desc}" />', head)
    head = re.sub(r'\s*<script type="application/ld\+json">.*?</script>', '', head, flags=re.S)
    head = head.replace('  </head>', ''.join(ld(s) for s in schemas + [breadcrumb(crumb_name, slug)]) + '  </head>', 1)
    head = head.replace('<body class="page-story">', f'<body class="{body_class}">')
    head = head.replace('href="#team"', 'href="/our-story#team"')
    tail = POST.replace('href="#team"', 'href="/our-story#team"')
    open(fname, 'w').write(head + '    <main id="main">\n' + main + '    </main>' + tail)
    print('built', fname)


# ---------------------------------------------------------------- Financial planning
fp_rows = [
    ('holistic', 'Your financial quarterback', 'Holistic Financial Planning',
     ['We serve as your financial quarterback, coordinating every aspect of your financial life, from investment management and retirement planning to tax and estate considerations, so every decision works together to help you build, protect, and transfer wealth.',
      "Most people come to us with no plan, no advisor, or an advisor who only talks about the one account they manage. There is far more to your financial plan than how a single IRA is performing."],
     ['Retirement readiness and income planning', 'Investment management built around your goals', 'Insurance and protection for your family', 'Debt, savings, and cash flow', 'How taxes affect every decision'],
     'Start your plan'),
    ('roth-ira', 'Build wealth', 'Roth IRAs',
     ['Think of a Roth IRA as a way to pay taxes on the seed, not the harvest. By contributing after-tax dollars now, you can enjoy decades of potential tax-free growth and withdrawals later, helping you keep more of your retirement savings.',
      'We help you decide whether a Roth fits your situation, how it works alongside a 401(k) or traditional IRA, and how much to contribute each year.'],
     ['Whether you qualify to contribute', 'Roth vs. traditional contributions', 'Roth conversions and their tax impact', 'Investing the account for the long term'],
     'Ask about Roth IRAs'),
    ('rollovers', 'Organize wealth', 'Rollovers',
     ["When leaving an employer, it's important to understand your retirement plan options. A rollover IRA may offer additional flexibility and investment choices, while allowing you to consolidate retirement accounts as part of an overall financial plan.",
      'The right decision depends on your unique situation and objectives. We walk through every option with you before anything moves.'],
     ['Old 401(k)s and 403(b)s from past employers', 'Keeping, moving, or consolidating accounts', 'Fees, investment choices, and flexibility', 'Avoiding unnecessary taxes during a move'],
     'Ask about rollovers'),
    ('tax-planning', 'Preserve wealth', 'Tax Planning',
     ["Tax planning helps coordinate your financial decisions with tax-efficient strategies so you can keep more of what you've earned and stay focused on your long-term goals.",
      'Because tax preparation happens under the same roof, your plan and your return are never strangers.'],
     ['Tax-aware investing and withdrawals', 'Timing of income, conversions, and gifts', 'Business and personal tax coordination', 'Year-end moves before December 31'],
     'Ask about tax planning'),
    ('saving-for-minors', 'Invest in future generations', 'Saving for Minors: 529s and UTMAs',
     ["Whether you're saving for education, future financial needs, or creating a lasting legacy, 529 plans and UTMA accounts can help provide a structured way to invest in a child's future.",
      "Each option offers unique benefits, and selecting the right strategy depends on your family's goals, timeline, and priorities."],
     ['529 plans vs. UTMA accounts', 'How much to save and when', 'Balancing college savings with retirement', 'Gifting from grandparents and family'],
     'Ask about 529s and UTMAs'),
    ('estate-planning', 'Transfer wealth', 'Estate Planning',
     ['Estate planning is a critical component of holistic financial planning. By coordinating legal, tax, investment, and legacy considerations, we help clients develop strategies designed to preserve wealth, support their families, and ensure their wishes are carried out efficiently.',
      "When legal documents are needed, we work alongside your attorney or connect you with trusted professionals."],
     ['Beneficiary designations', 'Charitable giving strategies', 'Passing assets to the next generation', 'Coordinating with your attorney'],
     'Ask about estate planning'),
]
fp_faq = [
    ('What is holistic financial planning?', 'It means looking at your whole financial life at once: investments, retirement, taxes, insurance, college savings, your business, and your estate. Instead of managing one account in isolation, we coordinate every decision so they work together.'),
    ('Do you only manage investments?', "No. We're holistic planners, not just asset managers. Investment management is one part of a plan that also covers retirement income, taxes, saving for kids, and estate considerations. If a need falls outside what we do, we connect you with trusted professionals."),
    ('Should I roll over my old 401(k)?', 'It depends on your situation. A rollover IRA may offer more flexibility and investment choices, but staying in a former employer\'s plan can make sense too. We walk through the options with you before anything moves.'),
    ('Do you work with clients outside Burnsville and Barron?', 'Yes. We meet in person at our Burnsville, MN and Barron, WI offices, and by video and phone wherever you live, including the Milwaukee area.'),
]
fp_main = page_hero(
    'Financial services &middot; Burnsville, MN &amp; Barron, WI',
    'Holistic financial planning that sees your whole picture.',
    'Roth IRAs, rollovers, tax planning, 529s, and estate planning, coordinated by one team so every decision works together.',
    'Financial Planning',
    jump_card('On this page', [(r[0], r[2].split(':')[0]) for r in fp_rows])) + detail_rows(fp_rows) + faq_html('Financial planning FAQ', 'Questions about planning with us.', fp_faq) + cta('Bring us the question you\'ve been putting off.', 'Can I retire? Can we buy the cabin? Should I roll over my 401(k)? Let\'s figure it out together.')
build('financial-planning.html', 'financial-planning',
      'Financial Planning, Roth IRAs &amp; Rollovers | Sloan Financial',
      'Holistic financial planning in Burnsville, MN and Barron, WI: Roth IRAs, 401(k) rollovers, tax planning, 529s, and estate planning, coordinated by one team.',
      'Financial Planning', 'page-detail',
      [{"@context": "https://schema.org", "@type": "Service", "name": "Holistic Financial Planning", "serviceType": "Financial planning", "provider": ORG,
        "areaServed": [f"{c} MN" for c in MN] + [f"{c} WI" for c in NW + SE],
        "hasOfferCatalog": {"@type": "OfferCatalog", "name": "Financial services", "itemListElement": [{"@type": "Offer", "itemOffered": {"@type": "Service", "name": r[2]}} for r in fp_rows]}},
       faq_ld(fp_faq)], fp_main)

# ---------------------------------------------------------------- Tax services
tx_rows = [
    ('tax-preparation', 'Individuals &amp; businesses', 'Tax Preparation',
     ['We provide accurate, reliable tax preparation services for individuals and businesses, helping clients maximize deductions, minimize tax liability, and stay compliant with ever-changing tax laws.',
      'Your return is prepared by the same team that knows your financial plan, so nothing gets lost between offices.'],
     ['Individual and family returns', 'Small business returns', 'Deductions and credits you may be missing', 'Staying current with tax law changes'],
     'Get your taxes done'),
    ('tax-planning', 'Year-round, not just April', 'Tax Planning',
     ['We do more than prepare tax returns. We help clients proactively navigate tax strategies, identify savings opportunities, and remain compliant, turning tax season into a tool for better financial planning.',
      "Even if we identify just one opportunity you didn't know was available, that can make a meaningful difference over time."],
     ['Projecting next year before it arrives', 'Retirement contributions and conversions', 'Business income and entity decisions', 'Tax-efficient retirement income'],
     'Plan ahead'),
    ('bookkeeping', 'For small businesses', 'Bookkeeping',
     ['Bookkeeping services help small businesses stay financially organized by accurately tracking income, expenses, invoices, payroll, and cash flow.',
      'Instead of spending valuable time managing financial records, business owners can focus on growing their business while gaining a clear, up-to-date picture of their financial health.'],
     ['Income and expense tracking', 'Invoices and payroll records', 'Cash flow visibility', 'Clean books at tax time'],
     'Ask about bookkeeping'),
    ('bookkeeping-plus', 'Your outsourced CFO', 'Bookkeeping Plus',
     ["We're more than bookkeepers. We act as your outsourced CFO, delivering clear financial reporting, cash flow visibility, and strategic advice that helps you make smarter decisions, improve profitability, and grow with confidence.",
      'All at a fraction of the cost of a full-time CFO.'],
     ['Monthly financial reporting', 'Cash flow and profitability insight', 'Strategic advice for growth decisions', 'Coordination with your personal plan'],
     'Ask about Bookkeeping Plus'),
]
tx_faq = [
    ('Do you prepare taxes for small businesses?', 'Yes. We prepare returns for individuals and businesses, and for business owners we coordinate the business and personal side so decisions work together.'),
    ('What is the difference between tax preparation and tax planning?', 'Tax preparation looks back: it files last year\'s return accurately. Tax planning looks ahead: it helps you make decisions during the year that can lower future taxes. We do both.'),
    ('Do you still do financial planning during tax season?', 'Yes. We never put financial planning on hold for tax season. You can call us about your plan any month of the year.'),
    ('What is the difference between Bookkeeping and Bookkeeping Plus?', 'Bookkeeping keeps your records accurate and organized. Bookkeeping Plus adds financial reporting, cash flow visibility, and strategic advice, like an outsourced CFO.'),
    ('Can I work with you remotely?', 'Yes. Many clients work with us by video, phone, and secure document exchange. You can also meet us in person in Burnsville, MN or Barron, WI.'),
]
tx_main = page_hero(
    'Tax &amp; accounting &middot; Burnsville, MN &amp; Barron, WI',
    'Tax preparation and planning, coordinated with your whole plan.',
    'Accurate returns for individuals and businesses, year-round tax planning, and bookkeeping, handled by the same team that knows your financial plan.',
    'Tax Services',
    jump_card('On this page', [(r[0], r[2]) for r in tx_rows])) + detail_rows(tx_rows) + faq_html('Tax services FAQ', 'Questions about taxes and bookkeeping.', tx_faq) + cta('Tax season is better with a plan.', 'Talk to Adam and the team about your return, your business, or next year\'s strategy.')
build('tax-services.html', 'tax-services',
      'Tax Preparation, Planning &amp; Bookkeeping | Sloan Financial',
      'Tax preparation for individuals and businesses, year-round tax planning, and small business bookkeeping in Burnsville, MN and Barron, WI. Call (952) 432-8000.',
      'Tax Services', 'page-detail',
      [{"@context": "https://schema.org", "@type": "Service", "name": "Tax Preparation and Tax Planning", "serviceType": "Tax preparation", "provider": ORG,
        "areaServed": [f"{c} MN" for c in MN] + [f"{c} WI" for c in NW + SE],
        "hasOfferCatalog": {"@type": "OfferCatalog", "name": "Tax and accounting services", "itemListElement": [{"@type": "Offer", "itemOffered": {"@type": "Service", "name": r[2]}} for r in tx_rows]}},
       faq_ld(tx_faq)], tx_main)


# ---------------------------------------------------------------- Locations
def services_block(title):
    cards = [
        ('/financial-planning#holistic', 'Holistic Financial Planning', 'Your financial quarterback for every decision.'),
        ('/financial-planning#roth-ira', 'Roth IRAs &amp; Rollovers', 'Build and organize your retirement savings.'),
        ('/financial-planning#saving-for-minors', '529s &amp; UTMAs', 'Invest in the next generation.'),
        ('/financial-planning#estate-planning', 'Estate Planning', 'Transfer wealth the way you intend.'),
        ('/tax-services#tax-preparation', 'Tax Preparation &amp; Planning', 'Accurate returns and year-round strategy.'),
        ('/tax-services#bookkeeping', 'Bookkeeping', 'Clean books and an outsourced CFO.'),
    ]
    li = ''.join(f'<a class="loc-svc" href="{h}"><strong>{t}</strong><span>{d}</span><em aria-hidden="true">&rarr;</em></a>' for h, t, d in cards)
    return f'''      <section class="loc-services section">
        <div class="container">
          <div class="section-head">
            <p class="eyebrow">Services</p>
            <h2>{title}</h2>
            <p class="section-sub">Financial planning and tax services under one roof, so a decision in one area never quietly works against another.</p>
          </div>
          <div class="loc-svc-grid">{li}</div>
        </div>
      </section>
'''


def person_mini(img, name, role, anchor, line):
    return f'''<a class="person-mini" href="/our-story#{anchor}">
              <img decoding="async" src="images/{img}" alt="{name}" width="120" height="120" loading="lazy" />
              <span><strong>{name}</strong><em>{role}</em><small>{line}</small></span>
            </a>'''


def office_side(name, addr_lines, phone, tel, email, maps_q):
    return f'''          <aside class="loc-card">
            <p class="loc-card-title">{name} office</p>
            <p class="loc-addr">{addr_lines}</p>
            <p><a class="loc-phone" href="tel:{tel}">{phone}</a></p>
            <p><a href="mailto:{email}">{email}</a></p>
            <p class="loc-hours"><span class="status" data-status><span class="status-dot"></span><span class="status-text">Mon to Fri, 9:00 to 4:30</span></span></p>
            <div class="loc-map"><iframe title="Map of the {name} office" src="https://maps.google.com/maps?q={maps_q}&amp;z=14&amp;hl=en&amp;output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>
            <a class="text-cta" href="https://maps.google.com/?q={maps_q}" target="_blank" rel="noopener noreferrer">Get directions {AR}</a>
          </aside>'''


def area_block(eyebrow, title, text, cities, people):
    return f'''      <section class="loc-area section">
        <div class="container loc-area-grid">
          <div>
            <p class="eyebrow">{eyebrow}</p>
            <h2>{title}</h2>
            <p class="loc-area-text">{text}</p>
            {city_chips(cities)}
          </div>
          <div class="loc-people">
            <p class="loc-people-title">Who you'll work with</p>
            {people}
          </div>
        </div>
      </section>
'''


# Burnsville
bv_faq = [
    ('Why work with a local financial advisor in Burnsville?', 'You get to sit down face to face with the person managing your plan, in an office close to home. We work with families and business owners across Burnsville, Apple Valley, Eagan, Savage, Prior Lake, Lakeville, and Shakopee, and meet by video when that is easier.'),
    ('Where is your Burnsville office?', 'We\'re at 12301 Nicollet Ave, Suite 101, Burnsville, MN 55337. Office hours are Monday to Friday, 9:00 to 4:30. Call <a href="tel:9524328000">(952) 432-8000</a> to set up a time.'),
    ('Do you offer tax preparation in Burnsville?', 'Yes. We prepare individual and business returns and offer year-round tax planning and bookkeeping, coordinated with your financial plan.'),
    ('Do I need a minimum amount to work with you?', 'We work with clients of all ages and walks of life. Call us and we\'ll tell you honestly whether we\'re a good fit.'),
]
bv_main = page_hero(
    'Burnsville, Minnesota',
    'Financial advisor and tax services in Burnsville, MN.',
    'Sloan Financial Solutions is a locally owned practice on Nicollet Avenue. David Sloan and his family live in Burnsville, and this is the community we chose to serve.',
    'Burnsville, MN',
    office_side('Burnsville', '12301 Nicollet Ave, Suite 101<br />Burnsville, MN 55337', '(952) 432-8000', '9524328000', 'david@sloanfs.com', '12301+Nicollet+Ave+Suite+101+Burnsville+MN+55337'))
bv_main += area_block('Communities we serve', 'Burnsville and the south metro.',
                      '"There are wealthier suburbs in the Twin Cities, but Burnsville is our home, and that\'s where I want to have a presence." &mdash; David Sloan. From this office we work with families, retirees, and business owners across Dakota and Scott counties.',
                      MN, person_mini('team-david.jpg', 'David Sloan', 'Founder &amp; Financial Advisor', 'david', 'Lives in Burnsville with his family') + person_mini('team-adam.jpg', 'Adam SanFelippo', 'Tax &amp; Accounting Advisor', 'adam', 'Tax preparation, planning, and bookkeeping'))
bv_main += services_block('Everything we offer in Burnsville.') + faq_html('Burnsville, MN FAQ', 'Questions people in Burnsville ask.', bv_faq) + cta('Stop by the Burnsville office.', 'Meet in person on Nicollet Avenue or by video. Either way, you\'ll talk to people who know your name.')
build('burnsville-mn.html', 'burnsville-mn',
      'Financial Advisor &amp; Tax Services in Burnsville, MN | Sloan',
      'Locally owned financial advisor and tax office on Nicollet Ave in Burnsville, MN, serving Apple Valley, Eagan, Savage, Prior Lake, Lakeville, and Shakopee.',
      'Burnsville, MN', 'page-detail page-location',
      [{"@context": "https://schema.org", "@type": "FinancialService", "@id": f"{DOM}/#burnsville", "name": "Sloan Financial Solutions", "url": f"{DOM}/burnsville-mn",
        "telephone": "+1-952-432-8000", "email": "david@sloanfs.com", "image": f"{DOM}/og-image.png", "address": BURNS_ADDR,
        "geo": {"@type": "GeoCoordinates", "latitude": 44.7801610, "longitude": -93.2787945}, "openingHoursSpecification": HOURS,
        "areaServed": [f"{c} MN" for c in MN], "priceRange": "$$"}, faq_ld(bv_faq)], bv_main)

# Barron
br_faq = [
    ('Do you have a financial advisor office in Barron, WI?', 'Yes. Our Barron office is at 421 E La Salle Ave, Suite A, run by Eric Holten, a Barron native. David Sloan grew up in Barron too, so for us it\'s home.'),
    ('Which communities does the Barron office serve?', 'We work with clients in Barron, Rice Lake, Cameron, Chetek, Spooner, Cumberland, Hayward, and across Northwest Wisconsin, in person or by video.'),
    ('Do you offer tax preparation in Barron?', 'Yes. We prepare individual and business returns and offer year-round tax planning and bookkeeping, coordinated with your financial plan.'),
    ('How do I set up a meeting in Barron?', 'Call <a href="tel:7154182044">(715) 418-2044</a> or email <a href="mailto:eric@sloanfs.com">eric@sloanfs.com</a>. Office hours are Monday to Friday, 9:00 to 4:30.'),
]
br_main = page_hero(
    'Barron, Wisconsin',
    'Financial advisor and tax services in Barron, WI.',
    '"Barron is where I grew up, and my family all still lives there. I wanted to provide a strong financial advising presence in my home community." &mdash; David Sloan',
    'Barron, WI',
    office_side('Barron', '421 E La Salle Ave, Suite A<br />Barron, WI 54812', '(715) 418-2044', '7154182044', 'eric@sloanfs.com', '421+E+La+Salle+Ave+Barron+WI+54812'))
br_main += area_block('Communities we serve', 'Barron and Northwest Wisconsin.',
                      'Eric Holten opened our Barron office in 2022 after years on the road. "I get to work with people I\'ve known most of my life, as well as people I\'m just getting to know." You\'ll find him at Barron games, coaching the varsity boys basketball team, or out in the woods.',
                      NW, person_mini('team-eric.jpg', 'Eric Holten', 'Financial Assistant', 'eric', 'Barron native, Life &amp; Health Insurance Agent') + person_mini('team-david.jpg', 'David Sloan', 'Founder &amp; Financial Advisor', 'david', 'Grew up in Barron'))
br_main += services_block('Everything we offer in Barron.') + faq_html('Barron, WI FAQ', 'Questions people in Barron ask.', br_faq) + cta('Stop by the Barron office.', 'Meet Eric on La Salle Avenue or by video. When you call in, you know us and we know you.')
build('barron-wi.html', 'barron-wi',
      'Financial Advisor &amp; Tax Services in Barron, WI | Sloan',
      'Financial advisor and tax office on La Salle Ave in Barron, WI, serving Rice Lake, Cameron, Chetek, Spooner, Cumberland, and Hayward.',
      'Barron, WI', 'page-detail page-location',
      [{"@context": "https://schema.org", "@type": "FinancialService", "@id": f"{DOM}/barron-wi#office", "name": "Sloan Financial Solutions, Barron office", "url": f"{DOM}/barron-wi",
        "telephone": "+1-715-418-2044", "email": "eric@sloanfs.com", "image": f"{DOM}/og-image.png", "address": BARRON_ADDR,
        "geo": {"@type": "GeoCoordinates", "latitude": 45.3999866, "longitude": -91.8520518}, "openingHoursSpecification": HOURS,
        "areaServed": [f"{c} WI" for c in NW], "parentOrganization": ORG, "priceRange": "$$"}, faq_ld(br_faq)], br_main)

# Milwaukee area (no office claimed)
mk_faq = [
    ('Do you have an office in Milwaukee?', 'Not at this time. We work with Milwaukee-area clients by video and phone, and Adam SanFelippo, our tax and accounting advisor, is based in the area. Our offices are in Burnsville, MN and Barron, WI.'),
    ('Which Milwaukee-area communities do you serve?', 'We work with clients in Milwaukee, New Berlin, Muskego, Franklin, Brookfield, West Allis, and across Southeast Wisconsin.'),
    ('How does working with you remotely work?', 'We meet by video or phone, exchange documents securely, and handle the paperwork for you. You get the same holistic planning and tax coordination as clients who visit our offices.'),
    ('How do I get started?', 'Call Adam at <a href="tel:2622720744">(262) 272-0744</a>, email <a href="mailto:adam@sloanfs.com">adam@sloanfs.com</a>, or call our main line at <a href="tel:9524328000">(952) 432-8000</a>.'),
]
mk_side = '''          <aside class="loc-card loc-card-person">
            <img decoding="async" src="images/team-adam.jpg" alt="Adam SanFelippo" width="360" height="360" />
            <p class="loc-card-title">Adam SanFelippo</p>
            <p class="loc-addr">Tax &amp; Accounting Advisor &middot; Milwaukee area</p>
            <p><a class="loc-phone" href="tel:2622720744">(262) 272-0744</a></p>
            <p><a href="mailto:adam@sloanfs.com">adam@sloanfs.com</a></p>
            <p class="loc-note">Meetings by video and phone</p>
          </aside>'''
mk_main = page_hero(
    'Southeast Wisconsin',
    'Financial planning and tax services for the Milwaukee area.',
    'Work with Sloan Financial Solutions from Milwaukee, New Berlin, Muskego, Franklin, Brookfield, or West Allis. We meet by video and phone, and our tax and accounting advisor, Adam SanFelippo, is based in the area.',
    'Milwaukee area', mk_side)
mk_main += area_block('Communities we serve', 'Milwaukee and Southeast Wisconsin.',
                      'Adam grew up in Milwaukee and spent more than a decade in banking and actuarial work before joining Sloan. He leads our tax preparation, tax planning, and bookkeeping, and works side by side with David on every client\'s plan.',
                      SE, person_mini('team-adam.jpg', 'Adam SanFelippo', 'Tax &amp; Accounting Advisor', 'adam', 'Grew up in Milwaukee') + person_mini('team-david.jpg', 'David Sloan', 'Founder &amp; Financial Advisor', 'david', 'Meets Milwaukee-area clients by video'))
mk_main += services_block('Everything we offer, wherever you are.') + faq_html('Milwaukee area FAQ', 'Questions from Southeast Wisconsin.', mk_faq) + cta('Let\'s meet by video.', 'Call Adam at (262) 272-0744 or reach our main office. We\'ll find a time that works for you.')
build('milwaukee-wi.html', 'milwaukee-wi',
      'Financial Planning &amp; Tax Help, Milwaukee Area | Sloan',
      'Financial planning, tax preparation, and bookkeeping by video for Milwaukee, New Berlin, Muskego, Franklin, Brookfield, and West Allis.',
      'Milwaukee area', 'page-detail page-location',
      [{"@context": "https://schema.org", "@type": "Service", "name": "Financial planning and tax services for the Milwaukee area", "provider": ORG,
        "areaServed": [f"{c} WI" for c in SE], "availableChannel": {"@type": "ServiceChannel", "serviceUrl": f"{DOM}/milwaukee-wi", "servicePhone": {"@type": "ContactPoint", "telephone": "+1-262-272-0744", "contactType": "customer service"}}},
       faq_ld(mk_faq)], mk_main)
