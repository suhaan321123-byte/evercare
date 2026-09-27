import { type ReactNode, useState } from "react";
import { ShoppingCart, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/context/CartContext";
import CartSheet from "@/components/CartSheet";
import AccountSheet from "@/components/accountSheet/AccountSheet";
import ProductSearchBox from "@/components/ProductSearchBox";

type HeaderProps = {
  hideSearch?: boolean;
  hideAccount?: boolean;
  hideCart?: boolean;
  rightContent?: ReactNode;
};

const Header = ({ hideSearch = false, hideAccount = false, hideCart = false, rightContent }: HeaderProps) => {
  const [cartOpen, setCartOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const { count } = useCart();

  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border shadow-soft">
      <div className="site-container flex items-center gap-4 py-3">
        <a href="/" className="flex items-center gap-3 shrink-0">
          <img
            src="/evercaremed_logo.png"
            alt="Store logo"
            className="block h-[52.8px] w-auto max-w-[176px] object-contain md:h-[61.6px] md:max-w-[220px]"
          />
        </a>

        {!hideSearch ? (
          <div className="ml-auto hidden w-full max-w-xl md:block">
            <ProductSearchBox showButton placeholder="Search medicines, wellness products, equipment..." />
          </div>
        ) : (
          <div className="flex-1" />
        )}

        <div className={`flex items-center gap-2 ${hideSearch ? "ml-auto" : ""}`}>
          {rightContent ? <div className="flex items-center">{rightContent}</div> : null}
          {!hideAccount ? (
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:flex flex-col gap-0 h-auto py-2"
              onClick={() => setAccountOpen(true)}
            >
              <User className="h-5 w-5" />
              <span className="text-[10px]">Account</span>
            </Button>
          ) : null}
          {!hideCart ? (
            <Button
              variant="ghost"
              size="sm"
              className="relative flex flex-col gap-0 h-auto py-2 cursor-pointer"
              onClick={() => setCartOpen(true)}
            >
              <div className="relative">
                <ShoppingCart className="h-5 w-5" />
                {count > 0 && (
                  <Badge className="absolute -top-2 -right-3 h-4 min-w-4 px-1 text-[10px] bg-accent hover:bg-accent">
                    {count}
                  </Badge>
                )}
              </div>
              <span className="text-[10px]">Cart</span>
            </Button>
          ) : null}
        </div>
      </div>

      {!hideSearch ? <div className="md:hidden w-full px-0 pb-3">
        <ProductSearchBox compact />
      </div> : null}

      {!hideCart ? <CartSheet open={cartOpen} onOpenChange={setCartOpen} /> : null}
      {!hideAccount ? <AccountSheet open={accountOpen} onOpenChange={setAccountOpen} /> : null}
    </header>
  );
};

export default Header;
