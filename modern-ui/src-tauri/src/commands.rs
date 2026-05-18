use serde::{Deserialize, Serialize};
use crate::db::get_connection;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Municipality {
    pub nome: String,
    pub cap: Vec<String>,
    pub sigla: String,
}

const COMUNI_JSON: &str = include_str!("../data/comuni.json");

#[derive(Serialize, Deserialize, Debug)]
pub struct Client {
    pub id: Option<i64>,
    #[serde(rename = "type")]
    pub type_: String,
    pub name: String,
    pub street: Option<String>,
    pub city: Option<String>,
    pub zip_code: Option<String>,
    pub province: Option<String>,
    pub vat_id: Option<String>,
    pub tax_code: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub notes: Option<String>,
    pub distance: Option<i32>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Project {
    pub id: Option<i64>,
    pub client_id: i64,
    pub name: String,
    pub description: Option<String>,
    pub status: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub budget: f64,
    pub client_name: Option<String>,
    pub costo_totale: Option<f64>,
    pub valore_lavori: Option<f64>,
    pub utile_previsto: Option<f64>,
    pub distance: Option<i32>,
    pub km_cost: Option<f64>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CostCenter {
    pub id: Option<i64>,
    pub project_id: i64,
    pub brand: Option<String>,
    pub model: String,
    pub category: Option<String>,
    pub base_cost: f64,
    pub markup: f64,
    pub shipping: f64,
    pub install_fee: f64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Material {
    pub id: Option<i64>,
    pub project_id: i64,
    pub cost_center_id: Option<i64>,
    pub phase: Option<String>,
    pub date: Option<String>,
    pub code: Option<String>,
    pub description: String,
    pub supplier: Option<String>,
    pub quantity: f64,
    pub unit: Option<String>,
    pub unit_price: f64,
    pub markup: f64,
    pub cost_center_name: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Labor {
    pub id: Option<i64>,
    pub project_id: i64,
    pub cost_center_id: Option<i64>,
    pub phase: Option<String>,
    pub date: Option<String>,
    pub operator: String,
    pub description: Option<String>,
    pub hours: f64,
    pub hourly_cost: f64,
    pub markup: f64,
    pub is_travel: bool,
    pub vehicle: Option<String>,
    pub travel_cost: Option<f64>,
    pub cost_center_name: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Expense {
    pub id: Option<i64>,
    pub project_id: i64,
    pub cost_center_id: Option<i64>,
    pub phase: Option<String>,
    pub date: Option<String>,
    pub description: String,
    pub amount: f64,
    pub markup: f64,
    pub supplier: Option<String>,
    pub cost_center_name: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Employee {
    pub id: Option<i64>,
    pub name: String,
    pub default_hourly_cost: f64,
}

#[tauri::command]
pub fn get_stats() -> serde_json::Value {
    let conn = match get_connection() {
        Ok(c) => c,
        Err(e) => {
            eprintln!("Database error in get_stats: {}", e);
            return serde_json::json!({
                "total_revenue": 0.0,
                "invoices_count": 0,
                "clients_count": 0,
                "total_pending": 0.0,
                "chart_data": []
            });
        }
    };

    // 1. Fatturato Totale (Somma dei budget delle commesse)
    let total_revenue: f64 = conn.query_row(
        "SELECT COALESCE(SUM(budget), 0.0) FROM projects",
        [],
        |row| row.get(0)
    ).unwrap_or(0.0);

    // 2. Progetti Attivi (status = 'active')
    let invoices_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM projects WHERE status = 'active'",
        [],
        |row| row.get(0)
    ).unwrap_or(0);

    // 3. Clienti Lely
    let clients_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM clients",
        [],
        |row| row.get(0)
    ).unwrap_or(0);

    // 4. Costi Totali Cumulati (materiali + manodopera + spese + centri di costo)
    let total_materials: f64 = conn.query_row(
        "SELECT COALESCE(SUM(quantity * unit_price), 0.0) FROM materials",
        [],
        |row| row.get(0)
    ).unwrap_or(0.0);

    let total_cost_centers: f64 = conn.query_row(
        "SELECT COALESCE(SUM(base_cost + shipping + install_fee), 0.0) FROM cost_centers",
        [],
        |row| row.get(0)
    ).unwrap_or(0.0);

    let total_labor: f64 = conn.query_row(
        "SELECT COALESCE(SUM(hours * hourly_cost + travel_cost), 0.0) FROM labor",
        [],
        |row| row.get(0)
    ).unwrap_or(0.0);

    let total_expenses: f64 = conn.query_row(
        "SELECT COALESCE(SUM(amount), 0.0) FROM expenses",
        [],
        |row| row.get(0)
    ).unwrap_or(0.0);

    let total_projects_travel: f64 = conn.query_row(
        "SELECT COALESCE(SUM(distance * km_cost), 0.0) FROM projects",
        [],
        |row| row.get(0)
    ).unwrap_or(0.0);

    let total_pending = total_materials + total_cost_centers + total_labor + total_expenses + total_projects_travel;

    // 5. Monthly Chart Data (Costi per mese dell'anno corrente)
    let mut chart_data = vec![
        serde_json::json!({"name": "Gen", "total": 0.0}),
        serde_json::json!({"name": "Feb", "total": 0.0}),
        serde_json::json!({"name": "Mar", "total": 0.0}),
        serde_json::json!({"name": "Apr", "total": 0.0}),
        serde_json::json!({"name": "Mag", "total": 0.0}),
        serde_json::json!({"name": "Giu", "total": 0.0}),
        serde_json::json!({"name": "Lug", "total": 0.0}),
        serde_json::json!({"name": "Ago", "total": 0.0}),
        serde_json::json!({"name": "Set", "total": 0.0}),
        serde_json::json!({"name": "Ott", "total": 0.0}),
        serde_json::json!({"name": "Nov", "total": 0.0}),
        serde_json::json!({"name": "Dic", "total": 0.0}),
    ];

    // Query per recuperare tutti i costi raggruppati per mese dell'anno corrente
    let stmt = conn.prepare("
        SELECT 
            substr(date, 6, 2) as month,
            SUM(amount) as cost
        FROM (
            SELECT date, quantity * unit_price as amount FROM materials
            UNION ALL
            SELECT p.start_date as date, base_cost + shipping + install_fee as amount FROM cost_centers cc JOIN projects p ON cc.project_id = p.id
            UNION ALL
            SELECT date, hours * hourly_cost + travel_cost as amount FROM labor
            UNION ALL
            SELECT date, amount FROM expenses
            UNION ALL
            SELECT start_date as date, distance * km_cost as amount FROM projects
        )
        WHERE substr(date, 1, 4) = strftime('%Y', 'now') AND date IS NOT NULL AND date != ''
        GROUP BY month
    ").ok();

    if let Some(mut s) = stmt {
        if let Ok(mut rows) = s.query([]) {
            while let Ok(Some(row)) = rows.next() {
                if let (Ok(month_str), Ok(cost)) = (row.get::<_, String>(0), row.get::<_, f64>(1)) {
                    if let Ok(month_idx) = month_str.parse::<usize>() {
                        if month_idx >= 1 && month_idx <= 12 {
                            chart_data[month_idx - 1] = serde_json::json!({
                                "name": match month_idx {
                                    1 => "Gen",
                                    2 => "Feb",
                                    3 => "Mar",
                                    4 => "Apr",
                                    5 => "Mag",
                                    6 => "Giu",
                                    7 => "Lug",
                                    8 => "Ago",
                                    9 => "Set",
                                    10 => "Ott",
                                    11 => "Nov",
                                    _ => "Dic"
                                },
                                "total": cost
                            });
                        }
                    }
                }
            }
        }
    }

    serde_json::json!({
        "total_revenue": total_revenue,
        "invoices_count": invoices_count,
        "clients_count": clients_count,
        "total_pending": total_pending,
        "chart_data": chart_data
    })
}

#[tauri::command]
pub fn search_municipalities(query: String) -> Result<Vec<Municipality>, String> {
    let comuni: Vec<Municipality> = serde_json::from_str(COMUNI_JSON).map_err(|e| e.to_string())?;
    let query_lower = query.to_lowercase();
    
    let filtered: Vec<Municipality> = comuni.into_iter()
        .filter(|m| m.nome.to_lowercase().starts_with(&query_lower))
        .take(10)
        .collect();
        
    Ok(filtered)
}

#[tauri::command]
pub fn get_clients() -> Result<Vec<Client>, String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT * FROM clients ORDER BY name ASC").map_err(|e| e.to_string())?;
    let client_iter = stmt.query_map([], |row| {
        Ok(Client {
            id: Some(row.get(0)?),
            type_: row.get(1)?,
            name: row.get(2)?,
            street: row.get(3)?,
            city: row.get(4)?,
            zip_code: row.get(5)?,
            province: row.get(6)?,
            vat_id: row.get(7)?,
            tax_code: row.get(8)?,
            email: row.get(9)?,
            phone: row.get(10)?,
            notes: row.get(11)?,
            distance: row.get(12)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut clients = Vec::new();
    for client in client_iter {
        clients.push(client.map_err(|e| e.to_string())?);
    }
    Ok(clients)
}

#[tauri::command]
pub fn save_client(client: Client) -> Result<(), String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    
    if let Some(id) = client.id {
        conn.execute(
            "UPDATE clients SET type=?, name=?, street=?, city=?, zip_code=?, province=?, vat_id=?, tax_code=?, email=?, phone=?, notes=?, distance=? WHERE id=?",
            [
                &client.type_, &client.name, 
                &client.street.unwrap_or_default(), &client.city.unwrap_or_default(),
                &client.zip_code.unwrap_or_default(), &client.province.unwrap_or_default(),
                &client.vat_id.unwrap_or_default(), &client.tax_code.unwrap_or_default(),
                &client.email.unwrap_or_default(), &client.phone.unwrap_or_default(),
                &client.notes.unwrap_or_default(), &client.distance.unwrap_or(0).to_string(),
                &id.to_string()
            ],
        ).map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "INSERT INTO clients (type, name, street, city, zip_code, province, vat_id, tax_code, email, phone, notes, distance) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                &client.type_, &client.name, 
                &client.street.unwrap_or_default(), &client.city.unwrap_or_default(),
                &client.zip_code.unwrap_or_default(), &client.province.unwrap_or_default(),
                &client.vat_id.unwrap_or_default(), &client.tax_code.unwrap_or_default(),
                &client.email.unwrap_or_default(), &client.phone.unwrap_or_default(),
                &client.notes.unwrap_or_default(), &client.distance.unwrap_or(0).to_string()
            ],
        ).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn delete_client(id: i64) -> Result<(), String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM clients WHERE id=?", [id]).map_err(|e| e.to_string())?;
    Ok(())
}

// PROJECTS (COMMESSE)
#[tauri::command]
pub fn get_projects() -> Result<Vec<Project>, String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("
        SELECT 
            p.id, p.client_id, p.name, p.description, p.status, p.start_date, p.end_date, p.budget,
            c.name as client_name,
            (
                (SELECT COALESCE(SUM(quantity * unit_price), 0.0) FROM materials WHERE project_id = p.id) +
                (SELECT COALESCE(SUM(base_cost + shipping + install_fee), 0.0) FROM cost_centers WHERE project_id = p.id) +
                (SELECT COALESCE(SUM(hours * hourly_cost + travel_cost), 0.0) FROM labor WHERE project_id = p.id) +
                (SELECT COALESCE(SUM(amount), 0.0) FROM expenses WHERE project_id = p.id) +
                COALESCE(p.distance * p.km_cost, 0.0)
            ) as costo_totale,
            (
                (SELECT COALESCE(SUM(quantity * unit_price * (1.0 + markup)), 0.0) FROM materials WHERE project_id = p.id) +
                (SELECT COALESCE(SUM((base_cost * (1.0 + markup)) + shipping + install_fee), 0.0) FROM cost_centers WHERE project_id = p.id) +
                (SELECT COALESCE(SUM((hours * hourly_cost + travel_cost) * (1.0 + markup)), 0.0) FROM labor WHERE project_id = p.id) +
                (SELECT COALESCE(SUM(amount * (1.0 + markup)), 0.0) FROM expenses WHERE project_id = p.id) +
                COALESCE(p.distance * p.km_cost, 0.0)
            ) as valore_lavori,
            p.distance,
            p.km_cost
        FROM projects p 
        LEFT JOIN clients c ON p.client_id = c.id 
        ORDER BY p.id DESC
    ").map_err(|e| e.to_string())?;
    
    let project_iter = stmt.query_map([], |row| {
        let budget: f64 = row.get(7)?;
        let costo_totale: f64 = row.get(9)?;
        let valore_lavori: f64 = row.get(10)?;
        let utile_previsto = valore_lavori - costo_totale;
        
        Ok(Project {
            id: Some(row.get(0)?),
            client_id: row.get(1)?,
            name: row.get(2)?,
            description: row.get(3)?,
            status: row.get(4)?,
            start_date: row.get(5)?,
            end_date: row.get(6)?,
            budget,
            client_name: row.get(8)?,
            costo_totale: Some(costo_totale),
            valore_lavori: Some(valore_lavori),
            utile_previsto: Some(utile_previsto),
            distance: row.get(11)?,
            km_cost: row.get(12)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut projects = Vec::new();
    for project in project_iter {
        projects.push(project.map_err(|e| e.to_string())?);
    }
    Ok(projects)
}

#[tauri::command]
pub fn save_project(project: Project) -> Result<(), String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    let dist = project.distance.unwrap_or(0);
    let k_cost = project.km_cost.unwrap_or(0.50);
    
    if let Some(id) = project.id {
        conn.execute(
            "UPDATE projects SET client_id=?, name=?, description=?, status=?, start_date=?, end_date=?, budget=?, distance=?, km_cost=? WHERE id=?",
            (
                project.client_id, project.name, project.description, project.status, 
                project.start_date, project.end_date, project.budget, dist, k_cost, id
            ),
        ).map_err(|e| e.to_string())?;

        // Aggiorna automaticamente tutte le spese di viaggio (trasferta) esistenti per questo progetto
        let new_travel_cost = (dist as f64) * k_cost;
        conn.execute(
            "UPDATE labor SET travel_cost = ? WHERE project_id = ? AND is_travel = 1",
            (new_travel_cost, id),
        ).map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "INSERT INTO projects (client_id, name, description, status, start_date, end_date, budget, distance, km_cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                project.client_id, project.name, project.description, project.status, 
                project.start_date, project.end_date, project.budget, dist, k_cost
            ),
        ).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn delete_project(id: i64) -> Result<(), String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM projects WHERE id=?", [id]).map_err(|e| e.to_string())?;
    Ok(())
}

// COST CENTERS
#[tauri::command]
pub fn get_cost_centers(project_id: i64) -> Result<Vec<CostCenter>, String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT * FROM cost_centers WHERE project_id = ? ORDER BY id ASC")
        .map_err(|e| e.to_string())?;
    
    let cc_iter = stmt.query_map([project_id], |row| {
        Ok(CostCenter {
            id: Some(row.get(0)?),
            project_id: row.get(1)?,
            brand: row.get(2)?,
            model: row.get(3)?,
            category: row.get(4)?,
            base_cost: row.get(5)?,
            markup: row.get(6)?,
            shipping: row.get(7)?,
            install_fee: row.get(8)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut centers = Vec::new();
    for cc in cc_iter {
        centers.push(cc.map_err(|e| e.to_string())?);
    }
    Ok(centers)
}

#[tauri::command]
pub fn save_cost_center(cc: CostCenter) -> Result<(), String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    
    if let Some(id) = cc.id {
        conn.execute(
            "UPDATE cost_centers SET brand=?, model=?, category=?, base_cost=?, markup=?, shipping=?, install_fee=? WHERE id=?",
            (cc.brand, cc.model, cc.category, cc.base_cost, cc.markup, cc.shipping, cc.install_fee, id),
        ).map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "INSERT INTO cost_centers (project_id, brand, model, category, base_cost, markup, shipping, install_fee) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (cc.project_id, cc.brand, cc.model, cc.category, cc.base_cost, cc.markup, cc.shipping, cc.install_fee),
        ).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn delete_cost_center(id: i64) -> Result<(), String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM cost_centers WHERE id=?", [id]).map_err(|e| e.to_string())?;
    Ok(())
}

// MATERIALS
#[tauri::command]
pub fn get_materials(project_id: i64) -> Result<Vec<Material>, String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("
        SELECT m.*, cc.model as cost_center_name 
        FROM materials m 
        LEFT JOIN cost_centers cc ON m.cost_center_id = cc.id 
        WHERE m.project_id = ? 
        ORDER BY m.date DESC, m.id DESC
    ").map_err(|e| e.to_string())?;
    
    let mat_iter = stmt.query_map([project_id], |row| {
        Ok(Material {
            id: Some(row.get(0)?),
            project_id: row.get(1)?,
            cost_center_id: row.get(2)?,
            phase: row.get(3)?,
            date: row.get(4)?,
            code: row.get(5)?,
            description: row.get(6)?,
            supplier: row.get(7)?,
            quantity: row.get(8)?,
            unit: row.get(9)?,
            unit_price: row.get(10)?,
            markup: row.get(11)?,
            cost_center_name: row.get(12)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut materials = Vec::new();
    for mat in mat_iter {
        materials.push(mat.map_err(|e| e.to_string())?);
    }
    Ok(materials)
}

#[tauri::command]
pub fn save_material(mat: Material) -> Result<(), String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    
    if let Some(id) = mat.id {
        conn.execute(
            "UPDATE materials SET cost_center_id=?, phase=?, date=?, code=?, description=?, supplier=?, quantity=?, unit=?, unit_price=?, markup=? WHERE id=?",
            (mat.cost_center_id, mat.phase, mat.date, mat.code, mat.description, mat.supplier, mat.quantity, mat.unit, mat.unit_price, mat.markup, id),
        ).map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "INSERT INTO materials (project_id, cost_center_id, phase, date, code, description, supplier, quantity, unit, unit_price, markup) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (mat.project_id, mat.cost_center_id, mat.phase, mat.date, mat.code, mat.description, mat.supplier, mat.quantity, mat.unit, mat.unit_price, mat.markup),
        ).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn delete_material(id: i64) -> Result<(), String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM materials WHERE id=?", [id]).map_err(|e| e.to_string())?;
    Ok(())
}

// LABOR
#[tauri::command]
pub fn get_labor(project_id: i64) -> Result<Vec<Labor>, String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("
        SELECT l.*, cc.model as cost_center_name 
        FROM labor l 
        LEFT JOIN cost_centers cc ON l.cost_center_id = cc.id 
        WHERE l.project_id = ? 
        ORDER BY l.date DESC, l.id DESC
    ").map_err(|e| e.to_string())?;
    
    let iter = stmt.query_map([project_id], |row| {
        Ok(Labor {
            id: Some(row.get(0)?),
            project_id: row.get(1)?,
            cost_center_id: row.get(2)?,
            phase: row.get(3)?,
            date: row.get(4)?,
            operator: row.get(5)?,
            description: row.get(6)?,
            hours: row.get(7)?,
            hourly_cost: row.get(8)?,
            markup: row.get(9)?,
            is_travel: row.get::<_, i32>(10)? != 0,
            vehicle: row.get(11)?,
            travel_cost: Some(row.get(12)?),
            cost_center_name: row.get(13)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for item in iter {
        result.push(item.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
pub fn save_labor(labor: Labor) -> Result<(), String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    let t_cost = labor.travel_cost.unwrap_or(0.0);
    
    if let Some(id) = labor.id {
        conn.execute(
            "UPDATE labor SET cost_center_id=?, phase=?, date=?, operator=?, description=?, hours=?, hourly_cost=?, markup=?, is_travel=?, vehicle=?, travel_cost=? WHERE id=?",
            (labor.cost_center_id, labor.phase, labor.date, labor.operator, labor.description, labor.hours, labor.hourly_cost, labor.markup, if labor.is_travel {1} else {0}, &labor.vehicle, t_cost, id),
        ).map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "INSERT INTO labor (project_id, cost_center_id, phase, date, operator, description, hours, hourly_cost, markup, is_travel, vehicle, travel_cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (labor.project_id, labor.cost_center_id, labor.phase, labor.date, labor.operator, labor.description, labor.hours, labor.hourly_cost, labor.markup, if labor.is_travel {1} else {0}, &labor.vehicle, t_cost),
        ).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn delete_labor(id: i64) -> Result<(), String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM labor WHERE id=?", [id]).map_err(|e| e.to_string())?;
    Ok(())
}

// EXPENSES
#[tauri::command]
pub fn get_expenses(project_id: i64) -> Result<Vec<Expense>, String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("
        SELECT ex.*, cc.model as cost_center_name 
        FROM expenses ex 
        LEFT JOIN cost_centers cc ON ex.cost_center_id = cc.id 
        WHERE ex.project_id = ? 
        ORDER BY ex.date DESC, ex.id DESC
    ").map_err(|e| e.to_string())?;
    
    let iter = stmt.query_map([project_id], |row| {
        Ok(Expense {
            id: Some(row.get(0)?),
            project_id: row.get(1)?,
            cost_center_id: row.get(2)?,
            phase: row.get(3)?,
            date: row.get(4)?,
            description: row.get(5)?,
            amount: row.get(6)?,
            markup: row.get(7)?,
            supplier: row.get(8)?,
            cost_center_name: row.get(9)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for item in iter {
        result.push(item.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
pub fn save_expense(expense: Expense) -> Result<(), String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    
    if let Some(id) = expense.id {
        conn.execute(
            "UPDATE expenses SET cost_center_id=?, phase=?, date=?, description=?, amount=?, markup=?, supplier=? WHERE id=?",
            (expense.cost_center_id, expense.phase, expense.date, expense.description, expense.amount, expense.markup, expense.supplier, id),
        ).map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "INSERT INTO expenses (project_id, cost_center_id, phase, date, description, amount, markup, supplier) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (expense.project_id, expense.cost_center_id, expense.phase, expense.date, expense.description, expense.amount, expense.markup, expense.supplier),
        ).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn delete_expense(id: i64) -> Result<(), String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM expenses WHERE id=?", [id]).map_err(|e| e.to_string())?;
    Ok(())
}

// EMPLOYEES
#[tauri::command]
pub fn get_employees() -> Result<Vec<Employee>, String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT * FROM employees ORDER BY name ASC").map_err(|e| e.to_string())?;
    let iter = stmt.query_map([], |row| {
        Ok(Employee {
            id: Some(row.get(0)?),
            name: row.get(1)?,
            default_hourly_cost: row.get(2)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for item in iter {
        result.push(item.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
pub fn save_employee(employee: Employee) -> Result<(), String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    if let Some(id) = employee.id {
        conn.execute(
            "UPDATE employees SET name=?, default_hourly_cost=? WHERE id=?",
            (&employee.name, employee.default_hourly_cost, id),
        ).map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "INSERT INTO employees (name, default_hourly_cost) VALUES (?, ?)",
            (&employee.name, employee.default_hourly_cost),
        ).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn delete_employee(id: i64) -> Result<(), String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM employees WHERE id=?", [id]).map_err(|e| e.to_string())?;
    Ok(())
}
#[tauri::command]
pub fn get_global_settings() -> Result<serde_json::Value, String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT key, value FROM global_settings").map_err(|e| e.to_string())?;
    
    let iter = stmt.query_map([], |row| {
        let key: String = row.get(0)?;
        let value: String = row.get(1)?;
        Ok((key, value))
    }).map_err(|e| e.to_string())?;
    
    let mut map = serde_json::Map::new();
    for item in iter {
        let (k, v) = item.map_err(|e| e.to_string())?;
        // Prova a parsare come JSON, altrimenti lascia come stringa
        if let Ok(json_val) = serde_json::from_str::<serde_json::Value>(&v) {
            map.insert(k, json_val);
        } else {
            map.insert(k, serde_json::Value::String(v));
        }
    }
    Ok(serde_json::Value::Object(map))
}

#[tauri::command]
pub fn save_global_settings(settings: serde_json::Value) -> Result<(), String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    let obj = settings.as_object().ok_or("Settings must be an object")?;
    
    for (k, v) in obj {
        let val_str = if v.is_string() {
            v.as_str().unwrap().to_string()
        } else {
            v.to_string()
        };
        
        conn.execute(
            "INSERT INTO global_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            [k, &val_str],
        ).map_err(|e| e.to_string())?;
    }
    Ok(())
}
