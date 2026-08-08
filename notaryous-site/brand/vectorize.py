import numpy as np, potrace, json
from PIL import Image, ImageFilter

SRC = '/mnt/user-data/uploads/IMG_0530.PNG'
img = Image.open(SRC).convert('RGB')
a = np.asarray(img).astype(np.int16)
H0, W0 = a.shape[:2]

r, g, b = a[..., 0], a[..., 1], a[..., 2]
lum = 0.299 * r + 0.587 * g + 0.114 * b
mask = (lum > 78) & ((r - b) > 38)

# drop the generator's sparkle watermark in the lower-right corner
mask[int(H0 * 0.75):, int(W0 * 0.85):] = False

ys, xs = np.where(mask)
pad = 30
y0, y1 = max(0, ys.min() - pad), min(H0 - 1, ys.max() + pad)
x0, x1 = max(0, xs.min() - pad), min(W0 - 1, xs.max() + pad)
mask = mask[y0:y1 + 1, x0:x1 + 1]
h, w = mask.shape

# supersample + blur + re-threshold: removes pixel staircase before tracing
SS = 3
m = Image.fromarray((mask * 255).astype(np.uint8), 'L')
m = m.resize((w * SS, h * SS), Image.LANCZOS)
m = m.filter(ImageFilter.GaussianBlur(radius=SS * 0.55))
mask_hi = np.asarray(m) > 128

bmp = potrace.Bitmap(~mask_hi)
path = bmp.trace(turdsize=SS * SS * 6, alphamax=1.0, opttolerance=0.28)

S = 1.0 / SS
def f(v): return ('%.2f' % (v * S)).rstrip('0').rstrip('.')

parts = []
for curve in path.curves:
    sp = curve.start_point
    d = 'M%s %s' % (f(sp.x), f(sp.y))
    for seg in curve.segments:
        if seg.is_corner:
            d += 'L%s %sL%s %s' % (f(seg.c.x), f(seg.c.y),
                                   f(seg.end_point.x), f(seg.end_point.y))
        else:
            d += 'C%s %s %s %s %s %s' % (f(seg.c1.x), f(seg.c1.y),
                                         f(seg.c2.x), f(seg.c2.y),
                                         f(seg.end_point.x), f(seg.end_point.y))
    parts.append(d + 'Z')

D = ''.join(parts)
json.dump({'d': D, 'w': w, 'h': h}, open('traced.json', 'w'))
print('subpaths:', len(parts), ' viewBox: 0 0 %d %d' % (w, h),
      ' path KB:', round(len(D) / 1024, 1))
