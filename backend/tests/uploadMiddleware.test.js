const upload = require('../src/middlewares/uploadMiddleware');

describe('Upload Middleware Unit Tests (White-Box)', () => {
  test('should configure memoryStorage and 10MB limits', () => {
    expect(upload.limits.fileSize).toBe(10 * 1024 * 1024);
    expect(typeof upload.fileFilter).toBe('function');
  });

  describe('fileFilter()', () => {
    test('Branch 1: should accept valid JPG image', (done) => {
      const mockFile = {
        originalname: 'vacation.jpg',
        mimetype: 'image/jpeg'
      };

      upload.fileFilter({}, mockFile, (err, accept) => {
        expect(err).toBeNull();
        expect(accept).toBe(true);
        done();
      });
    });

    test('Branch 2: should accept valid PNG image', (done) => {
      const mockFile = {
        originalname: 'avatar.PNG', // test case-insensitivity
        mimetype: 'image/png'
      };

      upload.fileFilter({}, mockFile, (err, accept) => {
        expect(err).toBeNull();
        expect(accept).toBe(true);
        done();
      });
    });

    test('Branch 3: should accept valid WEBP image', (done) => {
      const mockFile = {
        originalname: 'scenery.webp',
        mimetype: 'image/webp'
      };

      upload.fileFilter({}, mockFile, (err, accept) => {
        expect(err).toBeNull();
        expect(accept).toBe(true);
        done();
      });
    });

    test('Branch 4: should reject invalid MIME type even if extension is .jpg', (done) => {
      const mockFile = {
        originalname: 'fake.jpg',
        mimetype: 'application/octet-stream'
      };

      upload.fileFilter({}, mockFile, (err, accept) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe('Only JPG, PNG, WEBP, and GIF images are allowed.');
        expect(accept).toBeUndefined();
        done();
      });
    });

    test('Branch 5: should reject invalid extension even if MIME type is image/jpeg', (done) => {
      const mockFile = {
        originalname: 'photo.exe',
        mimetype: 'image/jpeg'
      };

      upload.fileFilter({}, mockFile, (err, accept) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe('Only JPG, PNG, WEBP, and GIF images are allowed.');
        done();
      });
    });

    test('Branch 6: should reject non-image file formats (e.g. PDF)', (done) => {
      const mockFile = {
        originalname: 'itinerary.pdf',
        mimetype: 'application/pdf'
      };

      upload.fileFilter({}, mockFile, (err, accept) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe('Only JPG, PNG, WEBP, and GIF images are allowed.');
        done();
      });
    });
  });
});
