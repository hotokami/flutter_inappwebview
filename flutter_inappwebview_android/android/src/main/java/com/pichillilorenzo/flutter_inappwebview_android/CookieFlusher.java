package com.pichillilorenzo.flutter_inappwebview_android;

import android.os.Build;
import android.util.Log;
import android.webkit.CookieManager;

import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Flushes cookies off the UI thread.
 *
 * Calling {@link CookieManager#flush()} from {@code onPageFinished} on the UI thread
 * can block for several seconds and trigger ANRs when page-finished events burst
 * (tab switches, successive navigations). Requests are coalesced so a burst
 * collapses to one or two flushes without dropping the last request.
 */
public final class CookieFlusher {
  private static final String LOG_TAG = "CookieFlusher";

  private static final AtomicBoolean pending = new AtomicBoolean(false);
  private static final Executor executor = Executors.newSingleThreadExecutor(new ThreadFactory() {
    @Override
    public Thread newThread(Runnable r) {
      Thread t = new Thread(r, "CookieFlusher");
      t.setDaemon(true);
      return t;
    }
  });

  private CookieFlusher() {}

  public static void flushAsync() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) {
      return;
    }
    if (!pending.compareAndSet(false, true)) {
      return;
    }
    executor.execute(new Runnable() {
      @Override
      public void run() {
        pending.set(false);
        try {
          CookieManager.getInstance().flush();
        } catch (Exception e) {
          Log.e(LOG_TAG, "CookieManager.flush() failed", e);
        }
      }
    });
  }
}
