"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useConfirmStore } from "@/store/confirm-store";

export function ConfirmDialog() {
  const request = useConfirmStore((s) => s.request);
  const close = useConfirmStore((s) => s.close);

  return (
    <AlertDialog open={!!request} onOpenChange={(open) => !open && close()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{request?.title}</AlertDialogTitle>
          {request?.description && <AlertDialogDescription>{request.description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Huỷ</AlertDialogCancel>
          <AlertDialogAction
            variant={request?.destructive ? "destructive" : "default"}
            onClick={() => {
              request?.onConfirm();
              close();
            }}
          >
            {request?.confirmLabel ?? "Xác nhận"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
