package com.tokoberkah.owner.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.tokoberkah.owner.navigation.Routes
import com.tokoberkah.owner.ui.components.AppHeader
import com.tokoberkah.owner.ui.components.BottomBar
import com.tokoberkah.owner.ui.components.BottomTab
import com.tokoberkah.owner.ui.components.FloatingWarningsHost
import com.tokoberkah.owner.ui.screens.BarangMasukScreen
import com.tokoberkah.owner.ui.screens.CekHargaScreen
import com.tokoberkah.owner.ui.screens.CekStokScreen
import com.tokoberkah.owner.ui.screens.LoginScreen
import com.tokoberkah.owner.ui.screens.ProdukDetailScreen
import com.tokoberkah.owner.ui.screens.RiwayatHargaScreen
import com.tokoberkah.owner.ui.screens.ScannerScreen
import com.tokoberkah.owner.ui.screens.UbahHargaScreen
import com.tokoberkah.owner.ui.theme.AppColors
import com.tokoberkah.owner.viewmodel.AuthViewModel
import com.tokoberkah.owner.viewmodel.PricingViewModel
import com.tokoberkah.owner.viewmodel.ProductsViewModel
import com.tokoberkah.owner.viewmodel.SessionState
import com.tokoberkah.owner.viewmodel.SharedUiViewModel
import com.tokoberkah.owner.viewmodel.StockViewModel
import com.tokoberkah.owner.viewmodel.WarningLevel

/**
 * Kerangka aplikasi: menunggu sesi, menampilkan login, lalu
 * BottomBar + NavHost untuk tiga menu utama dan layar turunannya.
 * Satu Activity, satu NavHost -> state halaman tetap terjaga.
 */
@Composable
fun AppContent(authVm: AuthViewModel) {
    val session by authVm.state.collectAsState()

    when (val s = session) {
        is SessionState.Loading -> {
            Box(
                Modifier.fillMaxSize().background(AppColors.Background),
                contentAlignment = Alignment.Center
            ) { CircularProgressIndicator(color = AppColors.Primary) }
        }
        is SessionState.LoggedOut -> LoginScreen(vm = authVm)
        is SessionState.LoggedIn -> MainShell(ownerName = s.session.nama)
    }
}

@Composable
private fun MainShell(ownerName: String) {
    val nav: NavHostController = rememberNavController()
    val productsVm: ProductsViewModel = viewModel()
    val pricingVm: PricingViewModel = viewModel()
    val stockVm: StockViewModel = viewModel()
    val shared: SharedUiViewModel = viewModel()
    val scope = rememberCoroutineScope()

    val warnings by shared.warnings.collectAsState()
    val productState by productsVm.ui.collectAsState()

    var showScanner by remember { mutableStateOf(false) }
    var showManualInput by remember { mutableStateOf(false) }
    var scannerWarning by remember { mutableStateOf<com.tokoberkah.owner.viewmodel.FloatingWarning?>(null) }

    val currentRoute = nav.currentBackStackEntry?.destination?.route
    val currentTab = when {
        currentRoute?.startsWith(Routes.CEK_STOK) == true -> BottomTab.CEK_STOK
        currentRoute?.startsWith(Routes.MASUK) == true -> BottomTab.MASUK
        else -> BottomTab.CEK_HARGA
    }

    fun selectTab(tab: BottomTab) {
        val route = when (tab) {
            BottomTab.CEK_HARGA -> Routes.CEK_HARGA
            BottomTab.CEK_STOK -> Routes.CEK_STOK
            BottomTab.MASUK -> Routes.masuk()
        }
        nav.navigate(route) {
            popUpTo(Routes.CEK_HARGA) { saveState = true }
            launchSingleTop = true
            restoreState = true
        }
    }

    /** Dipanggil dari kamera / input manual. */
    fun handleBarcode(code: String) {
        showScanner = false
        scannerWarning = null
        productsVm.lookupBarcode(code)
    }

    // Reaksi terhadap hasil lookup barcode.
    val scanResult by productsVm.scanResult.collectAsState()
    androidx.compose.runtime.LaunchedEffect(scanResult) {
        when (val r = scanResult) {
            is com.tokoberkah.owner.viewmodel.ScanOutcome.Found -> {
                shared.addScan(r.produk)
                shared.showWarning("${r.produk.nama} ditemukan.", WarningLevel.SUCCESS)
                when (currentTab) {
                    BottomTab.MASUK -> {
                        stockVm.startFor(r.produk)
                        nav.navigate(Routes.masuk(r.produk.id)) { launchSingleTop = true }
                    }
                    else -> nav.navigate(Routes.detail(r.produk.id)) { launchSingleTop = true }
                }
                productsVm.clearScanResult()
            }
            is com.tokoberkah.owner.viewmodel.ScanOutcome.NotFound -> {
                shared.showWarning(
                    "Barcode ${r.barcode} belum terdaftar. Daftarkan produk lewat Web Admin.",
                    WarningLevel.ERROR
                )
                productsVm.clearScanResult()
            }
            is com.tokoberkah.owner.viewmodel.ScanOutcome.Failed -> {
                shared.showWarning(r.error, WarningLevel.ERROR)
                productsVm.clearScanResult()
            }
            else -> Unit
        }
    }

    if (showScanner) {
        ScannerScreen(
            active = true,
            ownerName = ownerName,
            warning = scannerWarning,
            onDismissWarning = { scannerWarning = null },
            onBarcode = { code -> handleBarcode(code) },
            onClose = { showScanner = false },
            onManualInput = { showScanner = false; showManualInput = true }
        )
        return
    }

    if (showManualInput) {
        com.tokoberkah.owner.ui.components.ManualBarcodeDialog(
            onDismiss = { showManualInput = false },
            onSearch = { code ->
                showManualInput = false
                handleBarcode(code)
            }
        )
    }


    Column(
        Modifier
            .fillMaxSize()
            .background(AppColors.Background)
            .imePadding()
    ) {
        Box(
            Modifier
                .fillMaxWidth()
                .statusBarsPadding()
        ) {
            AppHeader(sectionTitle = currentTab.label)
        }

        Box(Modifier.weight(1f)) {
            NavHost(
                navController = nav,
                startDestination = Routes.CEK_HARGA,
                modifier = Modifier.fillMaxSize()
            ) {
                composable(Routes.CEK_HARGA) {
                    CekHargaScreen(
                        vm = productsVm,
                        shared = shared,
                        onScan = { scannerWarning = null; showScanner = true },
                        onManual = { showManualInput = true },
                        onProductClick = { p -> productsVm.select(p); nav.navigate(Routes.detail(p.id)) }
                    )
                }
                composable(
                    Routes.CEK_HARGA_DETAIL,
                    arguments = listOf(navArgument("produkId") { type = NavType.IntType })
                ) { entry ->
                    val id = entry.arguments?.getInt("produkId") ?: -1
                    val selected by productsVm.selected.collectAsState()
                    val produk = productState.produk.firstOrNull { it.id == id } ?: selected
                    if (produk != null) {
                        ProdukDetailScreen(
                            produk = produk,
                            onBack = { nav.popBackStack() },
                            onRiwayat = { pricingVm.refreshProduk(produk.id); nav.navigate(Routes.riwayat(produk.id)) },
                            onUbahHarga = { pricingVm.startChange(produk); nav.navigate(Routes.ubahHarga(produk.id)) }
                        )
                    } else {
                        androidx.compose.runtime.LaunchedEffect(id) { productsVm.refresh() }
                    }
                }
                composable(
                    Routes.RIWAYAT_HARGA,
                    arguments = listOf(navArgument("produkId") { type = NavType.IntType })
                ) { entry ->
                    val id = entry.arguments?.getInt("produkId") ?: -1
                    val produk = productState.produk.firstOrNull { it.id == id }
                    if (produk != null) {
                        RiwayatHargaScreen(
                            vm = pricingVm,
                            produk = produk,
                            onBack = { nav.popBackStack() },
                            onUbahHarga = {
                                pricingVm.startChange(produk)
                                nav.navigate(Routes.ubahHarga(produk.id))
                            }
                        )
                    }
                }
                composable(
                    Routes.UBAH_HARGA,
                    arguments = listOf(navArgument("produkId") { type = NavType.IntType })
                ) { entry ->
                    val id = entry.arguments?.getInt("produkId") ?: -1
                    val produk = pricingVm.change.collectAsState().value.produk
                        ?: productState.produk.firstOrNull { it.id == id }
                    if (produk != null) {
                        UbahHargaScreen(
                            vm = pricingVm,
                            produk = produk,
                            onBack = { nav.popBackStack() },
                            onSaved = { msg ->
                                shared.showWarning(msg, WarningLevel.SUCCESS)
                                productsVm.refresh()
                                nav.popBackStack(Routes.CEK_HARGA, inclusive = false)
                            }
                        )
                    }
                }
                composable(Routes.CEK_STOK) {
                    CekStokScreen(
                        vm = stockVm,
                        onScan = { scannerWarning = null; showScanner = true },
                        onProductClick = { p -> productsVm.select(p); nav.navigate(Routes.detail(p.id)) }
                    )
                }
                composable(
                    Routes.MASUK,
                    arguments = listOf(navArgument("produkId") { type = NavType.IntType })
                ) { entry ->
                    val id = entry.arguments?.getInt("produkId") ?: -1
                    androidx.compose.runtime.LaunchedEffect(id) {
                        if (id > 0) {
                            val p = productState.produk.firstOrNull { it.id == id }
                            if (p != null) stockVm.startFor(p)
                        }
                    }
                    BarangMasukScreen(
                        vm = stockVm,
                        onScan = { scannerWarning = null; showScanner = true }
                    )
                }
            }

            // Floating warning di atas konten
            FloatingWarningsHost(
                warnings = warnings,
                onDismiss = { shared.dismiss(it) },
                modifier = Modifier.align(Alignment.TopCenter).padding(top = 4.dp)
            )
        }

        BottomBar(current = currentTab, onSelect = { selectTab(it) })
    }
}

