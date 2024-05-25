(module
    (func (export "f32ToI32") (param $0 f32) (result i32)
        local.get $0
        i32.reinterpret_f32
    )
    (func (export "i32ToF32") (param $0 i32) (result f32)
        local.get $0
        f32.reinterpret_i32
    )
    (func (export "f64ToI64") (param $0 f64) (result i64)
        local.get $0
        i64.reinterpret_f64
    )
    (func (export "i64ToF64") (param $0 i64) (result f64)
        local.get $0
        f64.reinterpret_i64
    )
)
