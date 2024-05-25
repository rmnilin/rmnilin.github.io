#[no_mangle]
pub extern "C" fn f64_to_chars(input: f64) -> *mut i8 {
    std::ffi::CString::new(format!("{:.1074}", input).as_str())
        .unwrap()
        .into_raw()
}
