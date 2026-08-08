import json, os, cairosvg
T = json.load(open('traced.json')); D, W, H = T['d'], T['w'], T['h']

BORD, CORD, GOLD, GOLDDP = '#3B1116', '#2E0D12', '#E0B772', '#7E5C1E'
BONE, INK = '#EFEAE0', '#241014'
A = 'assets2/'

def wrap(inner, vb, w, h, bg=None):
    s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s" width="%s" height="%s">' % (vb, w, h)
    if bg: s += '<rect x="-9999" y="-9999" width="29999" height="29999" fill="%s"/>' % bg
    return s + inner + '</svg>\n'
def mark(f): return '<path d="%s" fill="%s" fill-rule="evenodd"/>' % (D, f)
def put(n, s): open(A + n, 'w').write(s)
VB = '0 0 %d %d' % (W, H)

put('mark-gold-on-bordeaux.svg', wrap(mark(GOLD), VB, W, H, BORD))
put('mark-bordeaux-on-bone.svg', wrap(mark(BORD), VB, W, H, BONE))
put('mark-gold.svg',            wrap(mark(GOLD), VB, W, H))
put('mark-bordeaux.svg',        wrap(mark(BORD), VB, W, H))
put('mark-ink.svg',             wrap(mark(INK),  VB, W, H))
put('mark-white.svg',           wrap(mark('#FFFFFF'), VB, W, H))

R = 512.0; sc = (R * 2 * 0.74) / H
tx, ty = R - W * sc / 2, R - H * sc / 2
def icon(shape, bgc, inkc, extra=''):
    return wrap(shape % bgc + extra +
        '<g transform="translate(%.2f,%.2f) scale(%.5f)">%s</g>' % (tx, ty, sc, mark(inkc)),
        '0 0 1024 1024', 1024, 1024)
CIRC = '<circle cx="512" cy="512" r="512" fill="%s"/>'
SQ   = '<rect width="1024" height="1024" rx="212" fill="%s"/>'
put('icon-disc-dark.svg',      icon(CIRC, BORD, GOLD))
put('icon-disc-light.svg',     icon(CIRC, BONE, BORD, '<circle cx="512" cy="512" r="509" fill="none" stroke="#D8CFBE" stroke-width="6"/>'))
put('icon-squircle-dark.svg',  icon(SQ, BORD, GOLD))
put('icon-squircle-light.svg', icon(SQ, BONE, BORD))

def nglyph(c, sw=92):
    return ('<path d="M306 706 L306 318 M306 318 L718 706 M718 706 L718 318" fill="none" '
            'stroke="%s" stroke-width="%d" stroke-linecap="round" stroke-linejoin="round"/>' % (c, sw))
put('favicon.svg',       wrap('<rect width="1024" height="1024" rx="200" fill="%s"/>%s' % (CORD, nglyph(GOLD)), '0 0 1024 1024', 1024, 1024))
put('favicon-light.svg', wrap('<rect width="1024" height="1024" rx="200" fill="%s"/>%s' % (BONE, nglyph(BORD)), '0 0 1024 1024', 1024, 1024))
put('favicon-mono.svg',  wrap(nglyph(INK), '0 0 1024 1024', 1024, 1024))

def txt(x, y, fill, size, track, anchor, s, op=1.0):
    return ('<text x="%.1f" y="%.1f" text-anchor="%s" fill="%s" fill-opacity="%s" '
            'font-family="Archivo, Helvetica Neue, Helvetica, Arial, sans-serif" font-size="%.1f" '
            'font-weight="500" letter-spacing="%.1f">%s</text>' % (x, y, anchor, fill, op, size, track, s))

def stacked(inkc, bg, name, subop=0.55):
    cx = W / 2
    inner = mark(inkc) + txt(cx, H + 104, inkc, 62, 20, 'middle', 'NOTARYOUS') \
                       + txt(cx, H + 148, inkc, 19, 11, 'middle', 'ONLINE NOTARIZATION', subop)
    put(name, wrap(inner, '-70 -40 %d %d' % (W + 140, H + 240), W + 140, H + 240, bg))
stacked(GOLD, BORD, 'lockup-stacked-dark.svg')
stacked(BORD, BONE, 'lockup-stacked-light.svg', 0.6)
stacked(INK,  '#FFFFFF', 'lockup-stacked-mono.svg', 0.6)

def horiz(inkc, bg, name, subop=0.55):
    s = 0.80
    inner = ('<g transform="scale(%.3f)">%s</g>' % (s, mark(inkc))
             + txt(W * s + 92, H * s * 0.53, inkc, 82, 26, 'start', 'NOTARYOUS')
             + txt(W * s + 96, H * s * 0.53 + 52, inkc, 24, 14.5, 'start', 'ONLINE NOTARIZATION', subop))
    put(name, wrap(inner, '-40 -30 %d %d' % (W * s + 900, H * s + 60), int(W * s + 900), int(H * s + 60), bg))
horiz(GOLD, BORD, 'lockup-horizontal-dark.svg')
horiz(BORD, BONE, 'lockup-horizontal-light.svg', 0.6)

# open graph 1200x630
og = ('<rect x="-9999" y="-9999" width="29999" height="29999" fill="%s"/>' % BORD
      + '<g transform="translate(96,110) scale(0.62)">%s</g>' % mark(GOLD)
      + txt(460, 300, '#F1E7DA', 76, 22, 'start', 'NOTARYOUS')
      # 9.4 not 13: at 13 the subline runs 52px past the 1200px canvas and
      # "$25 FLAT" is clipped off the card. 9.4 ends it flush with the wordmark.
      + txt(464, 352, GOLD, 24, 9.4, 'start', 'ONLINE NOTARIZATION &#183; $25 FLAT'))
put('og-image.svg', wrap(og, '0 0 1200 630', 1200, 630))

exports = [('icon-disc-dark.svg',[1024,512,256,180]),('icon-disc-light.svg',[1024,512]),
           ('icon-squircle-dark.svg',[1024,512]),('favicon.svg',[180,64,32,16]),
           ('favicon-light.svg',[64,32]),('mark-gold-on-bordeaux.svg',[1200]),
           ('mark-bordeaux-on-bone.svg',[1200]),('lockup-stacked-dark.svg',[1400]),
           ('lockup-stacked-light.svg',[1400]),('lockup-horizontal-dark.svg',[2000]),
           ('lockup-horizontal-light.svg',[2000]),('og-image.svg',[1200])]
n = 0
for src, sizes in exports:
    for px in sizes:
        cairosvg.svg2png(url=A+src, write_to='%spng/%s-%d.png' % (A, src[:-4], px), output_width=px); n += 1
print('svg:', len([f for f in os.listdir(A) if f.endswith('.svg')]), 'png:', n)
