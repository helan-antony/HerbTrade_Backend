
console.log('Starting import test...');
try { require('./routes/auth'); console.log('✅ auth ok'); } catch(e) { console.error('❌ auth fail', e.message); }
try { require('./routes/blog'); console.log('✅ blog ok'); } catch(e) { console.error('❌ blog fail', e.message); }
try { require('./routes/admin'); console.log('✅ admin ok'); } catch(e) { console.error('❌ admin fail', e.message); }
try { require('./routes/seller'); console.log('✅ seller ok'); } catch(e) { console.error('❌ seller fail', e.message); }
try { require('./routes/delivery'); console.log('✅ delivery ok'); } catch(e) { console.error('❌ delivery fail', e.message); }
try { require('./routes/products'); console.log('✅ products ok'); } catch(e) { console.error('❌ products fail', e.message); }
try { require('./routes/orders'); console.log('✅ orders ok'); } catch(e) { console.error('❌ orders fail', e.message); }
try { require('./routes/comments'); console.log('✅ comments ok'); } catch(e) { console.error('❌ comments fail', e.message); }
try { require('./routes/discussions'); console.log('✅ discussions ok'); } catch(e) { console.error('❌ discussions fail', e.message); }
try { require('./routes/hospitals'); console.log('✅ hospitals ok'); } catch(e) { console.error('❌ hospitals fail', e.message); }
try { require('./routes/appointments'); console.log('✅ appointments ok'); } catch(e) { console.error('❌ appointments fail', e.message); }
try { require('./routes/chatbot'); console.log('✅ chatbot ok'); } catch(e) { console.error('❌ chatbot fail', e.message); }
try { require('./routes/wishlist'); console.log('✅ wishlist ok'); } catch(e) { console.error('❌ wishlist fail', e.message); }
try { require('./routes/cart'); console.log('✅ cart ok'); } catch(e) { console.error('❌ cart fail', e.message); }
try { require('./routes/hospitalBookings'); console.log('✅ hospitalBookings ok'); } catch(e) { console.error('❌ hospitalBookings fail', e.message); }
try { require('./routes/googlePlaces'); console.log('✅ googlePlaces ok'); } catch(e) { console.error('❌ googlePlaces fail', e.message); }
try { require('./routes/ml'); console.log('✅ ml ok'); } catch(e) { console.error('❌ ml fail', e.message); }
console.log('Import test complete.');
