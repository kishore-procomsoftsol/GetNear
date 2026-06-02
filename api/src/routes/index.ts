import { Router } from 'express';
import authRouter from './auth';
import businessesRouter from './businesses';
import userRouter from './user';
import bookingsRouter from './bookings';
import messagesRouter from './messages';
import notificationsRouter from './notifications';
import reviewsRouter from './reviews';
import searchHistoryRouter from './searchHistory';
import dashboardRouter from './dashboard';
import adminRouter from './admin';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ message: 'GetNear API v1' });
});

router.use('/auth', authRouter);
router.use('/businesses', businessesRouter);
router.use('/user', userRouter);
router.use('/user/bookings', bookingsRouter);
router.use('/user/messages', messagesRouter);
router.use('/user/notifications', notificationsRouter);
router.use('/user/search-history', searchHistoryRouter);
router.use('/dashboard', dashboardRouter);
router.use('/admin', adminRouter);

// Geocode proxy (avoids CORS issues with Google Maps API from browser)
router.get('/geocode', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json({ data: [] });

  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) return res.json({ data: [] });

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q as string)}&key=${apiKey}&components=country:IN`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results?.length > 0) {
      const results = data.results.slice(0, 5).map((r: any) => ({
        name: r.formatted_address,
        lat: r.geometry.location.lat,
        lng: r.geometry.location.lng,
      }));
      return res.json({ data: results });
    }
    return res.json({ data: [] });
  } catch {
    return res.json({ data: [] });
  }
});

// Reverse geocode proxy (lat,lng → city name)
router.get('/reverse-geocode', async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.json({ data: null });

  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) return res.json({ data: null });

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results?.length > 0) {
      const components = data.results[0].address_components ?? [];
      const locality = components.find((c: any) => c.types.includes('locality'));
      const subLocality = components.find((c: any) => c.types.includes('sublocality_level_1'));
      const adminArea2 = components.find((c: any) => c.types.includes('administrative_area_level_2'));
      const adminArea1 = components.find((c: any) => c.types.includes('administrative_area_level_1'));

      const city = subLocality?.long_name ?? locality?.long_name ?? adminArea2?.long_name ?? adminArea1?.long_name ?? null;

      return res.json({ data: { city, formatted_address: data.results[0].formatted_address } });
    }
    return res.json({ data: null });
  } catch {
    return res.json({ data: null });
  }
});

// Reviews are nested under businesses
router.use('/businesses', reviewsRouter);

export default router;
