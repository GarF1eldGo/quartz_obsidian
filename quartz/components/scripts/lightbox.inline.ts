let lightbox = null;

document.addEventListener("nav", () => {
  setTimeout(() => {
    if (!lightbox) {
      lightbox = new SimpleLightbox('a.lightbox', {
        fileExt: 'png|jpg|jpeg|gif|svg',
      })
    } else {
      lightbox.refresh()
    }
  }, 50)
})