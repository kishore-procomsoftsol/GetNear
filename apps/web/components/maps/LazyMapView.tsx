import dynamic from 'next/dynamic'

export const LazyMapView = dynamic(
  () => import('./MapView').then((mod) => ({ default: mod.MapView })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-gray-100 rounded-xl animate-pulse" />
    ),
  }
)
