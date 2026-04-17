export type PatientPortalPhotoEditOptions = {
  rotation: 0 | 90 | 180 | 270
  mirrored: boolean
}

const MIME_TYPE = 'image/jpeg'

async function loadImageElement(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Não foi possível carregar a imagem selecionada.'))
    }
    image.src = objectUrl
  })
}

function isImageElement(
  image: ImageBitmap | HTMLImageElement,
): image is HTMLImageElement {
  return 'naturalWidth' in image && 'naturalHeight' in image
}

export async function applyPatientPortalPhotoEdits(
  file: File,
  options: PatientPortalPhotoEditOptions,
): Promise<File> {
  if (options.rotation === 0 && !options.mirrored) {
    return file
  }

  const image = typeof createImageBitmap === 'function' ? await createImageBitmap(file) : await loadImageElement(file)
  const width = isImageElement(image) ? image.naturalWidth : image.width
  const height = isImageElement(image) ? image.naturalHeight : image.height
  const isQuarterTurn = options.rotation === 90 || options.rotation === 270

  const canvas = document.createElement('canvas')
  canvas.width = isQuarterTurn ? height : width
  canvas.height = isQuarterTurn ? width : height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Não foi possível preparar a edição da foto.')
  }

  context.translate(canvas.width / 2, canvas.height / 2)
  if (options.mirrored) {
    context.scale(-1, 1)
  }
  context.rotate((options.rotation * Math.PI) / 180)
  context.drawImage(image as CanvasImageSource, -width / 2, -height / 2, width, height)

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((generatedBlob) => resolve(generatedBlob), MIME_TYPE, 0.92)
  })

  if (!blob) {
    throw new Error('Não foi possível gerar a foto editada.')
  }

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'tratamento'
  return new File([blob], `${baseName}_editada.jpg`, {
    type: MIME_TYPE,
    lastModified: Date.now(),
  })
}
