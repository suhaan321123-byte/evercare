"use client";

import NextLink from "next/link";
import {
  useParams as useNextParams,
  usePathname,
  useRouter,
  useSearchParams as useNextSearchParams,
} from "next/navigation";
import {
  AnchorHTMLAttributes,
  ComponentProps,
  ReactNode,
  forwardRef,
  useMemo,
} from "react";

type NavigateOptions = {
  replace?: boolean;
  state?: unknown;
};

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "className"> & {
  to?: string;
  href?: string;
  replace?: boolean;
  prefetch?: boolean;
  children?: ReactNode;
  className?: string;
};

export type NavLinkProps = Omit<LinkProps, "className"> & {
  className?: string | ((props: { isActive: boolean; isPending: boolean }) => string);
};

export function BrowserRouter({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function Routes({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function Route() {
  return null;
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ to, href, replace, prefetch = false, children, ...props }, ref) => {
    const target = href || to || "/";
    return (
      <NextLink
        ref={ref}
        href={target}
        replace={replace}
        prefetch={prefetch}
        {...(props as Omit<ComponentProps<typeof NextLink>, "href">)}
      >
        {children}
      </NextLink>
    );
  },
);

Link.displayName = "RouterCompatLink";

export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ to, href, className, children, ...props }, ref) => {
    const pathname = usePathname();
    const target = href || to || "/";
    const isActive = pathname === target;
    const resolvedClassName =
      typeof className === "function"
        ? className({ isActive, isPending: false })
        : className;

    return (
      <Link ref={ref} to={target} className={resolvedClassName} {...props}>
        {children}
      </Link>
    );
  },
);

NavLink.displayName = "RouterCompatNavLink";

export function useNavigate() {
  const router = useRouter();

  return (to: string | number, options?: NavigateOptions) => {
    if (typeof to === "number") {
      if (to !== 0) window.history.go(to);
      else router.refresh();
      return;
    }

    if (options?.replace) router.replace(to);
    else router.push(to);
  };
}

export function useLocation() {
  const pathname = usePathname();
  const searchParams = useNextSearchParams();
  const search = searchParams.toString();

  return useMemo(() => {
    const hash = typeof window === "undefined" ? "" : window.location.hash;
    return {
      pathname,
      search: search ? `?${search}` : "",
      hash,
      state: null,
      key: pathname,
    };
  }, [pathname, search]);
}

export function useParams() {
  return useNextParams();
}

export function useSearchParams(): [URLSearchParams, (next: URLSearchParams) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useNextSearchParams();

  const params = useMemo(
    () => new URLSearchParams(searchParams.toString()),
    [searchParams],
  );

  const setSearchParams = (next: URLSearchParams) => {
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return [params, setSearchParams];
}
