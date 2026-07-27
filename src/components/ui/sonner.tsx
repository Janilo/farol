import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[color:var(--farol-night-deep)] group-[.toaster]:text-[color:var(--farol-ink)] group-[.toaster]:border-transparent group-[.toaster]:rounded-sm group-[.toaster]:shadow-[0_10px_24px_rgba(6,25,43,0.26)]",
          description: "group-[.toast]:text-[color:var(--farol-mist)]",
          actionButton:
            "group-[.toast]:bg-[color:var(--farol-beam)] group-[.toast]:text-[color:var(--farol-ink)]",
          cancelButton:
            "group-[.toast]:bg-transparent group-[.toast]:text-[color:var(--farol-mist)]",
          success: "group-[.toaster]:[&_[data-icon]]:text-[color:var(--farol-tier-a)]",
          warning: "group-[.toaster]:[&_[data-icon]]:text-[color:var(--farol-tier-b)]",
          error: "group-[.toaster]:[&_[data-icon]]:text-[color:var(--farol-danger)]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
