const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
};

const setRefreshCookie = (res, token, cookieName = 'sf_refresh') => {
  res.cookie(cookieName, token, {
    ...COOKIE_OPTIONS,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
};

const clearRefreshCookie = (res, cookieName = 'sf_refresh') => {
  res.clearCookie(cookieName, COOKIE_OPTIONS);
};

module.exports = { setRefreshCookie, clearRefreshCookie };
