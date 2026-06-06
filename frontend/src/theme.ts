import { createTheme, theme } from "flowbite-react";
import type { DeepPartial, FlowbiteTheme } from "flowbite-react/types";
import { twMerge } from "tailwind-merge";

export const customTheme: DeepPartial<FlowbiteTheme> = createTheme({
  alert: {
    base: "flex flex-col gap-2 border p-4 text-sm",
    color: {
      primary:
        "border-primary-500 bg-primary-50 text-primary-800 dark:bg-primary-200 dark:text-primary-800",
      orange: "border-orange-500 bg-orange-500 text-white",
    },
  },
  checkbox: {
    color: {
      default:
        "focus:ring-primary-300 dark:focus:ring-primary-600 shrink-0 border-gray-300 bg-gray-50 bg-(length:--check-icon-size) text-blue-500 checked:border-blue-500 checked:bg-current checked:bg-(image:--check-icon) focus:ring-0 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800",
      blue: "bg-(length:--check-icon-size) text-blue-500 checked:border-blue-500 checked:bg-current checked:bg-(image:--check-icon) focus:ring-0 dark:ring-offset-transparent dark:focus:ring-0",
    },
  },
  radio: {
    base: "text-primary-600 focus:ring-primary-500 dark:focus:bg-primary-500 dark:focus:ring-primary-300 h-4 w-4 from-white from-43% via-current via-44% to-current !ring-0 checked:bg-radial checked:ring-0 focus:!ring-0 focus:outline-0 focus:outline-offset-0 dark:border-none dark:border-gray-600 dark:bg-gray-700 dark:ring-0 dark:outline-0 dark:outline-offset-0 dark:checked:ring-0 dark:focus:!ring-0 dark:focus:outline-0 dark:focus:outline-offset-0",
  },
  badge: {
    root: {
      size: {
        base: "p-[1.5em] text-base",
        lg: "p-[1.5em] text-lg",
        xl: "p-[1.5em] text-xl",
        "2xl": "p-[1.5em] text-2xl",
        "3xl": "p-[1.5em] text-3xl",
      },
      color: {
        custom: "",
        primary:
          "bg-primary-100 text-primary-800 group-hover:bg-primary-200 dark:bg-primary-200 dark:text-primary-900 dark:group-hover:bg-primary-300",
        info: "bg-blue-100 text-blue-800 group-hover:bg-blue-200 dark:bg-blue-200 dark:text-blue-900 dark:group-hover:bg-blue-300",
        gray: "bg-gray-100 text-gray-500 group-hover:bg-gray-200 dark:bg-gray-200 dark:text-gray-900 dark:group-hover:bg-gray-300",
        teal: "bg-teal-500/[14%] text-teal-500 hover:bg-teal-500/[14%] hover:text-teal-500 dark:bg-teal-200 dark:text-teal-900",
      },
    },
    icon: {
      off: "shrink-0 rounded-sm px-2 py-[0.25em]",
      on: "shrink-0 rounded-sm px-2 py-[0.25em]",
    },
  },
  button: {
    base: twMerge(theme.button.base, "cursor-pointer"),
    size: {
      xs: "px-2 py-1 text-xs",
    },
    color: {
      simple:
        "border-none bg-white text-gray-900 focus:ring-0 enabled:hover:bg-gray-50 dark:border-none dark:bg-gray-600 dark:text-white dark:enabled:hover:bg-gray-700",
      primary:
        "bg-primary-700 hover:bg-primary-800 focus:ring-primary-500 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800 text-[var(--color-primary-700-contrast)]",
      light:
        "border border-gray-300 bg-white text-gray-900 transition focus:ring-2 focus:ring-gray-300 enabled:hover:bg-gray-100 dark:border-gray-600 dark:text-white dark:focus:ring-gray-700 dark:enabled:hover:border-gray-700 dark:enabled:hover:bg-gray-700 [&_svg]:text-current",
      filterActive:
        "bg-primary-100 border-primary-800 enabled:hover:bg-primary-200 border text-gray-900 focus:text-gray-700 focus:ring-2 enabled:hover:text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:enabled:hover:bg-gray-700 dark:enabled:hover:text-white",
    },
  },
  dropdown: {
    base: "z-10 w-fit divide-y divide-gray-100 rounded shadow-lg focus:outline-none",
    arrowIcon: twMerge(
      theme.dropdown.arrowIcon,
      "absolute top-1/2 right-2 size-5 -translate-y-1/2",
    ),
  },
  popover: {
    base: "absolute z-20 inline-block w-max max-w-[100vw] rounded-lg border border-gray-200 bg-white shadow-lg outline-none dark:border-gray-600 dark:bg-gray-800",
  },
  modal: {
    root: {
      base: twMerge(theme.modal.root.base, "z-99999"),
      sizes: {
        "1600": "max-w-1600",
        "8xl": "max-w-8xl",
      },
    },
    content: {
      base: twMerge(theme.modal.content.base, "flex flex-col justify-center"),
    },
    header: {
      base: twMerge(theme.modal.header.base, "items-center border-0 pb-0"),
      title: twMerge(theme.modal.header.title, "font-semibold"),
      close: {
        base: twMerge(
          theme.modal.header.close.base,
          "hover:bg-gray-200 dark:hover:bg-gray-700",
        ),
        icon: theme.modal.header.close.icon,
      },
    },
    body: {
      base: twMerge(theme.modal.body.base, "overflow-visible"),
    },
    footer: {
      base: twMerge(theme.modal.footer.base, "justify-end"),
    }
  },
  progress: {
    color: {
      blue: "bg-blue-600",
      dark: "bg-gray-900 dark:bg-white",
      info: "bg-blue-600 dark:bg-blue-600",
      gray: "bg-gray-800 dark:bg-gray-700",
      failure: "bg-red-800 dark:bg-red-900",
      success: "bg-green-800 dark:bg-green-900",
      warning: "bg-yellow-800 dark:bg-yellow-900",
    },
    size: {
      xs: "h-1",
      md: "h-2",
    },
  },
  select: {
    field: {
      select: {
        sizes: {
          md: twMerge(
            theme.select.field.select.sizes.md,
            "text-base shadow-sm sm:text-sm",
          ),
        },
        colors: {
          gray: twMerge(
            theme.select.field.select.colors.gray,
            "border-gray-300 transition-shadow duration-200 focus:border-blue-500 focus:shadow-md focus:ring-blue-500 dark:border-gray-600 dark:focus:border-blue-500 dark:focus:ring-blue-500",
          ),
          light: twMerge(
            theme.select.field.select.colors.gray,
            "border-gray-300 transition-shadow duration-200 focus:border-blue-500 focus:shadow-md focus:ring-blue-500 dark:border-gray-600 dark:focus:border-blue-500 dark:focus:ring-blue-500",
          ),
        },
      },
    },
  },
  sidebar: {
    root: {
      inner: twMerge(
        theme.sidebar.root.inner,
        "scrollbar-on-hover overflow-y-scroll rounded-none bg-white pt-0 lg:pr-0",
      ),
    },
    collapse: {
      label: {
        icon: {
          base: twMerge(
            theme.sidebar.collapse.icon.base,
            "relative -right-1 !size-5 group-hover:text-gray-500",
          ),
        },
      },
    },
  },
  spinner: {
    size: {
      "2xl": "size-20",
      "3xl": "size-30",
    },
  },
  textarea: {
    base: twMerge(
      theme.textarea.base,
      "p-3 shadow-sm transition-shadow duration-200",
    ),
    colors: {
      gray: twMerge(
        theme.textarea.colors.gray,
        "border-gray-300 text-base text-gray-900 focus:border-blue-500 focus:shadow-md focus:ring-blue-500 sm:text-sm dark:border-gray-600 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500",
      ),
    },
  },
  textInput: {
    field: {
      input: {
        base: twMerge(
          theme.textInput.field.input.base,
          "shadow-sm outline-hidden transition-shadow duration-200",
        ),
        sizes: {
          tableFilter: "p-2.5 text-sm",
        },
        colors: {
          gray: twMerge(
            theme.textInput.field.input.colors.gray,
            "focus:border-primary-500 focus:ring-primary-500 dark:focus:border-primary-500 dark:focus:ring-primary-500 border-gray-300 text-gray-900 focus:text-black focus:shadow-md dark:border-gray-600 dark:text-white dark:focus:text-white",
          ),
        },
      },
    },
  },
  tooltip: {
    target: "w-full md:w-fit",
    arrow: {
      style: { dark: "bg-gray-800 bg-gray-900 dark:bg-gray-900" },
    },
    style: {
      dark: "bg-gray-800 bg-gray-900 text-white dark:bg-gray-900",
    },
    content: twMerge(theme.tooltip.content, "max-w-140"),
  },
  toggleSwitch: {
    root: {
      base: "group flex rounded-lg focus:outline-hidden",
    },
    toggle: {
      base: twMerge(
        theme.toggleSwitch.toggle.base,
        "toggle-bg rounded-full border-none group-focus:ring-0",
      ),
      checked: {
        color: {
          blue: "border-blue-600 bg-blue-600",
        },
      },
    },
  },
  card: {
    root: {
      base: twMerge(theme.card.root.base, "border-none shadow"),
      children: "p-4",
    },
  },
  table: {
    root: {
      shadow: "hidden",
    },
  },
  tabs: {
    tablist: {
      tabitem: {
        variant: {
          fullWidth: {
            active: {
              on: "active rounded-none bg-blue-500 p-4 text-gray-50 dark:bg-blue-600 dark:text-white",
              off: "rounded-none bg-white hover:bg-gray-50 hover:text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:hover:text-white",
            },
          },
        },
      },
    },
  },
});
