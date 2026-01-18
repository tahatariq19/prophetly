from PIL import Image, ImageDraw

# Create a 64x64 transparent image
size = (64, 64)
img = Image.new('RGBA', size, (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# Colors
purple = (168, 85, 247, 255) # #a855f7
cyan = (6, 182, 212, 255)    # #06b6d4

# Draw a thick stylized chart line (chevron/lightning shape)
# Points for a "growth" line
points = [
    (10, 50), # Start bottom left
    (25, 30), # Peak 1
    (35, 45), # Dip
    (55, 15)  # Peak 2 (Top right)
]

# Draw the line (thick)
draw.line(points, fill=purple, width=6)

# Add a slight cyan accent/glow point at the end
# draw.ellipse([52, 12, 58, 18], fill=cyan)

# Save
img.save('c:/Users/mantis/proj/prophetly/frontend/public/favicon.png')
print("Favicon generated successfully.")
