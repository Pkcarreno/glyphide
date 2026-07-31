import { createCn } from "cnfast";

const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [
        "text-status-bar",
        "text-section-header",
        "text-ui-label",
        "text-code",
      ],
    },
    theme: {
      spacing: ["safearea-t", "safearea-r", "safearea-b", "safearea-l"],
    },
  },
});

export { cn };
