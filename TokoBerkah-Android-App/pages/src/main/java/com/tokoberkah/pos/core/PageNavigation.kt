package com.tokoberkah.pos.core

import android.widget.TextView
import androidx.fragment.app.Fragment
import com.tokoberkah.pos.R

/** Pushes a new page on top of the current one (adds to the back stack). */
fun Fragment.openPage(target: Fragment) {
    requireActivity().supportFragmentManager
        .beginTransaction()
        .replace(R.id.fragmentContainer, target)
        .addToBackStack(null)
        .commit()
}

/** Swaps the current page for [target] without growing the back stack. */
fun Fragment.replaceTop(target: Fragment) {
    requireActivity().supportFragmentManager
        .beginTransaction()
        .replace(R.id.fragmentContainer, target)
        .commit()
}

/** Returns to the previous page, if there is one. */
fun Fragment.goBack() {
    val fm = requireActivity().supportFragmentManager
    if (fm.backStackEntryCount > 0) fm.popBackStack()
}

/** Updates the breadcrumb shown in the shared store header. */
fun Fragment.setBreadcrumb(title: String) {
    requireActivity().findViewById<TextView>(R.id.tvBreadcrumb)?.text = title
}
