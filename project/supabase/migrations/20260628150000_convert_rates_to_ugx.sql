-- Convert room base rates and legacy booking nightly rates from USD to UGX
UPDATE rooms SET base_rate = 180000 WHERE room_type = '2BR Suite';
UPDATE rooms SET base_rate = 90000  WHERE room_type = 'Single';

UPDATE bookings SET nightly_rate = 180000 WHERE nightly_rate = 50;
UPDATE bookings SET nightly_rate = 90000  WHERE nightly_rate = 25;
