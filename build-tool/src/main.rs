use std::{
    fs,
    path::{Path, PathBuf},
};

fn main() {
    let input_dir = PathBuf::from("../src/pages/");
    let output_dir = PathBuf::from("../build/");

    println!("\x1b[1mBuilding...\x1b[0m");

    let _ = fs::remove_dir_all(&output_dir);

    build_dir(&input_dir, &output_dir);

    println!("\x1b[1mBuilding done.\x1b[0m");
}

fn build_dir(input_dir: &Path, output_dir: &Path) {
    fs::create_dir_all(output_dir).unwrap();

    for entry in fs::read_dir(input_dir).unwrap() {
        let entry = entry.unwrap();
        let path = entry.path();
        let name = path.file_name().unwrap();

        if path.is_dir() {
            build_dir(&path, &output_dir.join(name));
            continue;
        }

        if let Some(Some(extension)) = path.extension().map(|s| s.to_str()) {
            match extension {
                "html" => {
                    build_html(&path, &output_dir.join(name));
                    continue;
                }
                "rs" => {
                    let basename = path.file_stem().unwrap();
                    std::process::Command::new("rustc")
                        .arg("--target")
                        .arg("wasm32-unknown-unknown")
                        .arg("--crate-type")
                        .arg("cdylib")
                        .arg("--codegen").arg("lto")
                        .arg("--codegen").arg("opt-level=s")
                        .arg("-o").arg(output_dir.join(basename).with_extension("wasm"))
                        .arg(&path)
                        .status()
                        .unwrap();
                    wasm_opt::OptimizationOptions::new_opt_level_4()
                        .run(
                            output_dir.join(basename).with_extension("wasm"),
                            output_dir.join(basename).with_extension("wasm"),
                        )
                        .unwrap();
                    continue;
                }
                "wat" => {
                    let basename = path.file_stem().unwrap();
                    let output = wabt::wat2wasm(&fs::read(&path).unwrap()).unwrap();
                    fs::write(output_dir.join(basename).with_extension("wasm"), output).unwrap();
                    continue;
                }
                _ => {}
            }
        }

        fs::write(output_dir.join(name), fs::read(&path).unwrap()).unwrap();
    }
}

fn build_html(input_path: &Path, output_path: &Path) {
    let tera = tera::Tera::new("../src/**/*.html").unwrap();
    let output = tera
        .render(
            input_path.to_str().unwrap().trim_start_matches("../src/"),
            &tera::Context::new(),
        )
        .unwrap();
    fs::write(output_path, output).unwrap();
}
