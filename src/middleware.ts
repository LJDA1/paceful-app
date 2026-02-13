import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Routes that don't require authentication
const publicRoutes = [
  '/auth/login',
  '/auth/signup',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/auth/callback',
  // Marketing pages
  '/',
  '/pricing',
  '/about',
  '/privacy',
  '/terms',
  '/design-partners',
  '/api-docs',
  '/investors',
];

// Routes that require authentication but not completed onboarding
const authOnlyRoutes = ['/onboarding'];

// Routes that are completely public (marketing, landing)
const marketingRoutes = ['/', '/pricing', '/about', '/privacy', '/terms', '/design-partners', '/api-docs', '/investors'];

// App routes that require completed onboarding
const appRoutes = ['/dashboard', '/journal', '/mood', '/moods', '/ers', '/exercises', '/predictions', '/matches'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // static files
  ) {
    return NextResponse.next();
  }

  // Create Supabase client
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Get current session
  const { data: { user } } = await supabase.auth.getUser();

  // Check route types
  const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'));
  const isAuthOnlyRoute = authOnlyRoutes.some((route) => pathname.startsWith(route));
  const isMarketingRoute = marketingRoutes.some((route) => pathname === route);
  const isAuthRoute = pathname.startsWith('/auth/');
  const isAppRoute = appRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'));

  // If user is not authenticated
  if (!user) {
    // Allow public routes and marketing routes
    if (isPublicRoute || isMarketingRoute) {
      return response;
    }

    // Redirect to login for protected routes (app routes and onboarding)
    if (isAppRoute || isAuthOnlyRoute) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    // For other routes, allow access
    return response;
  }

  // User is authenticated
  if (isAuthRoute && !pathname.includes('/callback') && !pathname.includes('/reset-password')) {
    // Redirect authenticated users away from login/signup pages to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Check if onboarding is completed for app routes
  if (isAppRoute) {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('user_id', user.id)
        .single();

      // If profile doesn't exist or onboarding not completed, redirect to onboarding
      if (error || !profile || !profile.onboarding_completed) {
        // Only redirect if not already on onboarding page
        if (!isAuthOnlyRoute) {
          return NextResponse.redirect(new URL('/onboarding', request.url));
        }
      }
    } catch {
      // On error, redirect to onboarding
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
