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
    pub pec: Option<String>,
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
    pub address: Option<String>,
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
    pub install_fee_percent: Option<f64>,
    pub accepted_budget: Option<f64>,
}

impl CostCenter {
    pub fn from_row(row: &rusqlite::Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            project_id: row.get("project_id")?,
            brand: row.get("brand")?,
            model: row.get("model")?,
            category: row.get("category")?,
            base_cost: row.get::<_, Option<f64>>("base_cost")?.unwrap_or(0.0),
            markup: row.get::<_, Option<f64>>("markup")?.unwrap_or(0.0),
            shipping: row.get::<_, Option<f64>>("shipping")?.unwrap_or(0.0),
            install_fee: row.get::<_, Option<f64>>("install_fee")?.unwrap_or(0.0),
            accepted_budget: Some(row.get::<_, Option<f64>>("accepted_budget")?.unwrap_or(0.0)),
            install_fee_percent: Some(row.get::<_, Option<f64>>("install_fee_percent")?.unwrap_or(0.06)),
        })
    }
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

impl Material {
    pub fn from_row(row: &rusqlite::Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            project_id: row.get("project_id")?,
            cost_center_id: row.get("cost_center_id")?,
            phase: row.get("phase")?,
            date: row.get("date")?,
            code: row.get("code")?,
            description: row.get("description")?,
            supplier: row.get("supplier")?,
            quantity: row.get::<_, Option<f64>>("quantity")?.unwrap_or(1.0),
            unit: row.get("unit")?,
            unit_price: row.get::<_, Option<f64>>("unit_price")?.unwrap_or(0.0),
            markup: row.get::<_, Option<f64>>("markup")?.unwrap_or(0.25),
            cost_center_name: row.get("cost_center_name").ok(),
        })
    }
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

impl Labor {
    pub fn from_row(row: &rusqlite::Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            project_id: row.get("project_id")?,
            cost_center_id: row.get("cost_center_id")?,
            phase: row.get("phase")?,
            date: row.get("date")?,
            operator: row.get("operator")?,
            description: row.get("description")?,
            hours: row.get::<_, Option<f64>>("hours")?.unwrap_or(0.0),
            hourly_cost: row.get::<_, Option<f64>>("hourly_cost")?.unwrap_or(0.0),
            markup: row.get::<_, Option<f64>>("markup")?.unwrap_or(0.0),
            is_travel: row.get::<_, Option<i32>>("is_travel")?.unwrap_or(0) != 0,
            vehicle: row.get("vehicle")?,
            travel_cost: Some(row.get::<_, Option<f64>>("travel_cost")?.unwrap_or(0.0)),
            cost_center_name: row.get("cost_center_name").ok(),
        })
    }
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

impl Expense {
    pub fn from_row(row: &rusqlite::Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            project_id: row.get("project_id")?,
            cost_center_id: row.get("cost_center_id")?,
            phase: row.get("phase")?,
            date: row.get("date")?,
            description: row.get("description")?,
            amount: row.get::<_, Option<f64>>("amount")?.unwrap_or(0.0),
            markup: row.get::<_, Option<f64>>("markup")?.unwrap_or(0.0),
            supplier: row.get("supplier")?,
            cost_center_name: row.get("cost_center_name").ok(),
        })
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Employee {
    pub id: Option<i64>,
    pub name: String,
    pub default_hourly_cost: f64,
}

impl Employee {
    pub fn from_row(row: &rusqlite::Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            name: row.get("name")?,
            default_hourly_cost: row.get::<_, Option<f64>>("default_hourly_cost")?.unwrap_or(30.0),
        })
    }
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
                "utile_previsto": 0.0,
                "utile_effettivo": 0.0,
                "chart_data": []
            });
        }
    };

    // 1. Fatturato Totale (Somma dei preventivi accettati dei singoli centri di costo)
    let total_revenue: f64 = conn.query_row(
        "SELECT COALESCE(SUM(accepted_budget), 0.0) FROM cost_centers",
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
        "SELECT COALESCE(SUM(COALESCE(quantity, 0.0) * COALESCE(unit_price, 0.0)), 0.0) FROM materials",
        [],
        |row| row.get(0)
    ).unwrap_or(0.0);

    let total_cost_centers: f64 = conn.query_row(
        "SELECT COALESCE(SUM(COALESCE(base_cost, 0.0) + COALESCE(shipping, 0.0) + COALESCE(install_fee, 0.0)), 0.0) FROM cost_centers",
        [],
        |row| row.get(0)
    ).unwrap_or(0.0);

    let total_labor: f64 = conn.query_row(
        "SELECT COALESCE(SUM(COALESCE(hours, 0.0) * COALESCE(hourly_cost, 0.0) + COALESCE(travel_cost, 0.0)), 0.0) FROM labor",
        [],
        |row| row.get(0)
    ).unwrap_or(0.0);

    let total_expenses: f64 = conn.query_row(
        "SELECT COALESCE(SUM(COALESCE(amount, 0.0)), 0.0) FROM expenses",
        [],
        |row| row.get(0)
    ).unwrap_or(0.0);

    let total_pending = total_materials + total_cost_centers + total_labor + total_expenses;

    // Calcoliamo il valore totale dei lavori (con markup) per determinare l'utile previsto
    let valore_materials: f64 = conn.query_row(
        "SELECT COALESCE(SUM(COALESCE(quantity, 0.0) * COALESCE(unit_price, 0.0) * (1.0 + COALESCE(markup, 0.0))), 0.0) FROM materials",
        [],
        |row| row.get(0)
    ).unwrap_or(0.0);

    let valore_cost_centers: f64 = conn.query_row(
        "SELECT COALESCE(SUM(COALESCE(base_cost, 0.0) * (1.0 + COALESCE(markup, 0.0)) + COALESCE(shipping, 0.0) + COALESCE(install_fee, 0.0)), 0.0) FROM cost_centers",
        [],
        |row| row.get(0)
    ).unwrap_or(0.0);

    let valore_labor: f64 = conn.query_row(
        "SELECT COALESCE(SUM((COALESCE(hours, 0.0) * COALESCE(hourly_cost, 0.0) + COALESCE(travel_cost, 0.0)) * (1.0 + COALESCE(markup, 0.0))), 0.0) FROM labor",
        [],
        |row| row.get(0)
    ).unwrap_or(0.0);

    let valore_expenses: f64 = conn.query_row(
        "SELECT COALESCE(SUM(COALESCE(amount, 0.0) * (1.0 + COALESCE(markup, 0.0))), 0.0) FROM expenses",
        [],
        |row| row.get(0)
    ).unwrap_or(0.0);

    let total_valore_lavori = valore_materials + valore_cost_centers + valore_labor + valore_expenses;
    let utile_previsto = total_valore_lavori - total_pending;
    let utile_effettivo = total_revenue - total_pending;

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
            SELECT date, COALESCE(quantity, 0.0) * COALESCE(unit_price, 0.0) as amount FROM materials
            UNION ALL
            SELECT p.start_date as date, COALESCE(cc.base_cost, 0.0) + COALESCE(cc.shipping, 0.0) + COALESCE(cc.install_fee, 0.0) as amount FROM cost_centers cc JOIN projects p ON cc.project_id = p.id
            UNION ALL
            SELECT date, COALESCE(hours, 0.0) * COALESCE(hourly_cost, 0.0) + COALESCE(travel_cost, 0.0) as amount FROM labor
            UNION ALL
            SELECT date, COALESCE(amount, 0.0) as amount FROM expenses
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
        "utile_previsto": utile_previsto,
        "utile_effettivo": utile_effettivo,
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

impl Client {
    pub fn from_row(row: &rusqlite::Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            type_: row.get("type")?,
            name: row.get("name")?,
            street: row.get("street")?,
            city: row.get("city")?,
            zip_code: row.get("zip_code")?,
            province: row.get("province")?,
            vat_id: row.get("vat_id")?,
            tax_code: row.get("tax_code")?,
            email: row.get("email")?,
            pec: row.get("pec")?,
            phone: row.get("phone")?,
            notes: row.get("notes")?,
            distance: row.get("distance")?,
        })
    }
}

#[tauri::command]
pub fn get_clients() -> Result<Vec<Client>, String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, type, name, street, city, zip_code, province, vat_id, tax_code, email, pec, phone, notes, distance FROM clients ORDER BY name ASC").map_err(|e| e.to_string())?;
    let client_iter = stmt.query_map([], |row| Client::from_row(row)).map_err(|e| e.to_string())?;

    let mut clients = Vec::new();
    for client in client_iter {
        clients.push(client.map_err(|e| e.to_string())?);
    }
    Ok(clients)
}

#[tauri::command]
pub fn save_client(client: Client) -> Result<(), String> {
    log::info!("CMD [save_client] Input: {:?}", client);
    let result = (|| -> Result<(), String> {
        let conn = get_connection().map_err(|e| e.to_string())?;
        
        if let Some(id) = client.id {
            conn.execute(
                "UPDATE clients SET type=?, name=?, street=?, city=?, zip_code=?, province=?, vat_id=?, tax_code=?, email=?, pec=?, phone=?, notes=?, distance=? WHERE id=?",
                [
                    &client.type_, &client.name, 
                    &client.street.unwrap_or_default(), &client.city.unwrap_or_default(),
                    &client.zip_code.unwrap_or_default(), &client.province.unwrap_or_default(),
                    &client.vat_id.unwrap_or_default(), &client.tax_code.unwrap_or_default(),
                    &client.email.unwrap_or_default(), &client.pec.unwrap_or_default(),
                    &client.phone.unwrap_or_default(), &client.notes.unwrap_or_default(),
                    &client.distance.unwrap_or(0).to_string(), &id.to_string()
                ],
            ).map_err(|e| e.to_string())?;
        } else {
            conn.execute(
                "INSERT INTO clients (type, name, street, city, zip_code, province, vat_id, tax_code, email, pec, phone, notes, distance) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    &client.type_, &client.name, 
                    &client.street.unwrap_or_default(), &client.city.unwrap_or_default(),
                    &client.zip_code.unwrap_or_default(), &client.province.unwrap_or_default(),
                    &client.vat_id.unwrap_or_default(), &client.tax_code.unwrap_or_default(),
                    &client.email.unwrap_or_default(), &client.pec.unwrap_or_default(),
                    &client.phone.unwrap_or_default(), &client.notes.unwrap_or_default(),
                    &client.distance.unwrap_or(0).to_string()
                ],
            ).map_err(|e| e.to_string())?;
        }
        Ok(())
    })();
    match &result {
        Ok(_) => log::info!("CMD [save_client] Success"),
        Err(e) => log::error!("CMD [save_client] Failed: {}", e),
    }
    result
}

#[tauri::command]
pub fn delete_client(id: i64) -> Result<(), String> {
    log::info!("CMD [delete_client] ID: {}", id);
    let result = (|| -> Result<(), String> {
        let conn = get_connection().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM clients WHERE id=?", [id]).map_err(|e| e.to_string())?;
        Ok(())
    })();
    match &result {
        Ok(_) => log::info!("CMD [delete_client] Success"),
        Err(e) => log::error!("CMD [delete_client] Failed: {}", e),
    }
    result
}

// PROJECTS (COMMESSE)
#[tauri::command]
pub fn get_projects() -> Result<Vec<Project>, String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("
        SELECT 
            p.id, p.client_id, p.name, p.description, p.status, p.start_date, p.end_date,
            (SELECT COALESCE(SUM(COALESCE(cc.accepted_budget, 0.0)), 0.0) FROM cost_centers cc WHERE cc.project_id = p.id) as budget,
            c.name as client_name,
            (
                (SELECT COALESCE(SUM(COALESCE(quantity, 0.0) * COALESCE(unit_price, 0.0)), 0.0) FROM materials WHERE project_id = p.id) +
                (SELECT COALESCE(SUM(COALESCE(base_cost, 0.0) + COALESCE(shipping, 0.0) + COALESCE(install_fee, 0.0)), 0.0) FROM cost_centers WHERE project_id = p.id) +
                (SELECT COALESCE(SUM(COALESCE(hours, 0.0) * COALESCE(hourly_cost, 0.0) + COALESCE(travel_cost, 0.0)), 0.0) FROM labor WHERE project_id = p.id) +
                (SELECT COALESCE(SUM(COALESCE(amount, 0.0)), 0.0) FROM expenses WHERE project_id = p.id)
            ) as costo_totale,
            (
                (SELECT COALESCE(SUM(COALESCE(quantity, 0.0) * COALESCE(unit_price, 0.0) * (1.0 + COALESCE(markup, 0.0))), 0.0) FROM materials WHERE project_id = p.id) +
                (SELECT COALESCE(SUM(COALESCE(base_cost, 0.0) * (1.0 + COALESCE(markup, 0.0)) + COALESCE(shipping, 0.0) + COALESCE(install_fee, 0.0)), 0.0) FROM cost_centers WHERE project_id = p.id) +
                (SELECT COALESCE(SUM((COALESCE(hours, 0.0) * COALESCE(hourly_cost, 0.0) + COALESCE(travel_cost, 0.0)) * (1.0 + COALESCE(markup, 0.0))), 0.0) FROM labor WHERE project_id = p.id) +
                (SELECT COALESCE(SUM(COALESCE(amount, 0.0) * (1.0 + COALESCE(markup, 0.0))), 0.0) FROM expenses WHERE project_id = p.id)
            ) as valore_lavori,
            p.distance,
            p.km_cost,
            p.address
        FROM projects p 
        LEFT JOIN clients c ON p.client_id = c.id 
        ORDER BY p.id DESC
    ").map_err(|e| e.to_string())?;
    
    let project_iter = stmt.query_map([], |row| {
        let budget: f64 = row.get::<_, Option<f64>>(7)?.unwrap_or(0.0);
        let costo_totale: f64 = row.get::<_, Option<f64>>(9)?.unwrap_or(0.0);
        let valore_lavori: f64 = row.get::<_, Option<f64>>(10)?.unwrap_or(0.0);
        let utile_previsto = budget - costo_totale;
        
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
            distance: row.get::<_, Option<i32>>(11)?,
            km_cost: row.get::<_, Option<f64>>(12)?,
            address: row.get(13)?,
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
    log::info!("CMD [save_project] Input: {:?}", project);
    let result = (|| -> Result<(), String> {
        let conn = get_connection().map_err(|e| e.to_string())?;
        let dist = project.distance.unwrap_or(0);
        let k_cost = project.km_cost.unwrap_or(0.50);
        
        if let Some(id) = project.id {
            conn.execute(
                "UPDATE projects SET client_id=?, name=?, description=?, status=?, start_date=?, end_date=?, budget=?, distance=?, km_cost=?, address=? WHERE id=?",
                (
                    project.client_id, project.name, project.description, project.status, 
                    project.start_date, project.end_date, project.budget, dist, k_cost, project.address, id
                ),
            ).map_err(|e| e.to_string())?;

            // Aggiorna automaticamente tutte le spese di viaggio (trasferta) esistenti per questo progetto (solo per quelle senza un veicolo specifico)
            let new_travel_cost = (dist as f64) * k_cost;
            conn.execute(
                "UPDATE labor SET travel_cost = ? WHERE project_id = ? AND is_travel = 1 AND (vehicle IS NULL OR vehicle = 'Nessuno')",
                (new_travel_cost, id),
            ).map_err(|e| e.to_string())?;
        } else {
            conn.execute(
                "INSERT INTO projects (client_id, name, description, status, start_date, end_date, budget, distance, km_cost, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    project.client_id, project.name, project.description, project.status, 
                    project.start_date, project.end_date, project.budget, dist, k_cost, project.address
                ),
            ).map_err(|e| e.to_string())?;
        }
        Ok(())
    })();
    match &result {
        Ok(_) => log::info!("CMD [save_project] Success"),
        Err(e) => log::error!("CMD [save_project] Failed: {}", e),
    }
    result
}

#[tauri::command]
pub fn delete_project(id: i64) -> Result<(), String> {
    log::info!("CMD [delete_project] ID: {}", id);
    let result = (|| -> Result<(), String> {
        let conn = get_connection().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM projects WHERE id=?", [id]).map_err(|e| e.to_string())?;
        Ok(())
    })();
    match &result {
        Ok(_) => log::info!("CMD [delete_project] Success"),
        Err(e) => log::error!("CMD [delete_project] Failed: {}", e),
    }
    result
}

// COST CENTERS
#[tauri::command]
pub fn get_cost_centers(project_id: i64) -> Result<Vec<CostCenter>, String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, project_id, brand, model, category, base_cost, markup, shipping, install_fee, accepted_budget, install_fee_percent FROM cost_centers WHERE project_id = ? ORDER BY id ASC")
        .map_err(|e| e.to_string())?;
    
    let cc_iter = stmt.query_map([project_id], |row| CostCenter::from_row(row)).map_err(|e| e.to_string())?;

    let mut centers = Vec::new();
    for cc in cc_iter {
        centers.push(cc.map_err(|e| e.to_string())?);
    }
    Ok(centers)
}

#[tauri::command]
pub fn save_cost_center(cc: CostCenter) -> Result<(), String> {
    log::info!("CMD [save_cost_center] Input: {:?}", cc);
    let result = (|| -> Result<(), String> {
        if cc.model.trim().is_empty() {
            return Err("Il modello del centro di costo non può essere vuoto".to_string());
        }
        if cc.base_cost < 0.0 {
            return Err("Il costo base del macchinario non può essere negativo".to_string());
        }
        if cc.markup < 0.0 {
            return Err("Il ricarico non può essere negativo".to_string());
        }
        if cc.shipping < 0.0 {
            return Err("Le spese di trasporto non possono essere negative".to_string());
        }
        if cc.install_fee < 0.0 {
            return Err("Le spese di installazione non possono essere negative".to_string());
        }

        let conn = get_connection().map_err(|e| e.to_string())?;
        
        if let Some(id) = cc.id {
            conn.execute(
                "UPDATE cost_centers SET brand=?, model=?, category=?, base_cost=?, markup=?, shipping=?, install_fee=?, install_fee_percent=?, accepted_budget=? WHERE id=?",
                (cc.brand, cc.model, cc.category, cc.base_cost, cc.markup, cc.shipping, cc.install_fee, cc.install_fee_percent.unwrap_or(0.06), cc.accepted_budget.unwrap_or(0.0), id),
            ).map_err(|e| e.to_string())?;
        } else {
            conn.execute(
                "INSERT INTO cost_centers (project_id, brand, model, category, base_cost, markup, shipping, install_fee, install_fee_percent, accepted_budget) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (cc.project_id, cc.brand, cc.model, cc.category, cc.base_cost, cc.markup, cc.shipping, cc.install_fee, cc.install_fee_percent.unwrap_or(0.06), cc.accepted_budget.unwrap_or(0.0)),
            ).map_err(|e| e.to_string())?;
        }
        Ok(())
    })();
    match &result {
        Ok(_) => log::info!("CMD [save_cost_center] Success"),
        Err(e) => log::error!("CMD [save_cost_center] Failed: {}", e),
    }
    result
}

#[tauri::command]
pub fn delete_cost_center(id: i64) -> Result<(), String> {
    log::info!("CMD [delete_cost_center] ID: {}", id);
    let result = (|| -> Result<(), String> {
        let mut conn = get_connection().map_err(|e| e.to_string())?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;
        
        tx.execute("DELETE FROM materials WHERE cost_center_id=?", [id]).map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM labor WHERE cost_center_id=?", [id]).map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM expenses WHERE cost_center_id=?", [id]).map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM cost_centers WHERE id=?", [id]).map_err(|e| e.to_string())?;
        
        tx.commit().map_err(|e| e.to_string())?;
        Ok(())
    })();
    match &result {
        Ok(_) => log::info!("CMD [delete_cost_center] Success"),
        Err(e) => log::error!("CMD [delete_cost_center] Failed: {}", e),
    }
    result
}

// MATERIALS
#[tauri::command]
pub fn get_materials(project_id: i64) -> Result<Vec<Material>, String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("
        SELECT m.id, m.project_id, m.cost_center_id, m.phase, m.date, m.code, m.description, m.supplier, m.quantity, m.unit, m.unit_price, m.markup, cc.model as cost_center_name 
        FROM materials m 
        LEFT JOIN cost_centers cc ON m.cost_center_id = cc.id 
        WHERE m.project_id = ? 
        ORDER BY m.date DESC, m.id DESC
    ").map_err(|e| e.to_string())?;
    
    let mat_iter = stmt.query_map([project_id], |row| Material::from_row(row)).map_err(|e| e.to_string())?;

    let mut materials = Vec::new();
    for mat in mat_iter {
        materials.push(mat.map_err(|e| e.to_string())?);
    }
    Ok(materials)
}

#[tauri::command]
pub fn save_material(mat: Material) -> Result<(), String> {
    log::info!("CMD [save_material] Input: {:?}", mat);
    let result = (|| -> Result<(), String> {
        if mat.description.trim().is_empty() {
            return Err("La descrizione del materiale non può essere vuota".to_string());
        }
        if mat.quantity <= 0.0 {
            return Err("La quantità deve essere maggiore di zero".to_string());
        }
        if mat.unit_price < 0.0 {
            return Err("Il costo unitario non può essere negativo".to_string());
        }
        if mat.markup < 0.0 {
            return Err("Il ricarico non può essere negativo".to_string());
        }

        let conn = get_connection().map_err(|e| e.to_string())?;
        
        // Se è presente un codice valido, controlliamo se esiste già nel catalogo globale
        if let Some(ref code) = mat.code {
            let trimmed = code.trim();
            if !trimmed.is_empty() {
                let exists: bool = conn.query_row(
                    "SELECT COUNT(*) FROM catalog_materials WHERE LOWER(code) = LOWER(?)",
                    [trimmed],
                    |row| row.get(0)
                ).unwrap_or(0) > 0;

                if !exists {
                    conn.execute(
                        "INSERT INTO catalog_materials (code, description, unit, unit_price, supplier, markup) VALUES (?, ?, ?, ?, ?, ?)",
                        (
                            trimmed,
                            &mat.description,
                            mat.unit.as_deref().unwrap_or("pz"),
                            mat.unit_price,
                            mat.supplier.as_deref().unwrap_or(""),
                            mat.markup
                        )
                    ).map_err(|e| e.to_string())?;
                }
            }
        }

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
    })();
    match &result {
        Ok(_) => log::info!("CMD [save_material] Success"),
        Err(e) => log::error!("CMD [save_material] Failed: {}", e),
    }
    result
}

#[tauri::command]
pub fn delete_material(id: i64) -> Result<(), String> {
    log::info!("CMD [delete_material] ID: {}", id);
    let result = (|| -> Result<(), String> {
        let conn = get_connection().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM materials WHERE id=?", [id]).map_err(|e| e.to_string())?;
        Ok(())
    })();
    match &result {
        Ok(_) => log::info!("CMD [delete_material] Success"),
        Err(e) => log::error!("CMD [delete_material] Failed: {}", e),
    }
    result
}

#[tauri::command]
pub fn move_materials_cost_center(material_ids: Vec<i64>, cost_center_id: Option<i64>) -> Result<(), String> {
    log::info!("CMD [move_materials_cost_center] Input: ids={:?}, target_cc={:?}", material_ids, cost_center_id);
    let result = (|| -> Result<(), String> {
        let mut conn = get_connection().map_err(|e| e.to_string())?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;
        
        {
            let mut stmt = tx.prepare("UPDATE materials SET cost_center_id = ? WHERE id = ?")
                .map_err(|e| e.to_string())?;
            for id in material_ids {
                stmt.execute((cost_center_id, id)).map_err(|e| e.to_string())?;
            }
        }
        
        tx.commit().map_err(|e| e.to_string())?;
        Ok(())
    })();
    match &result {
        Ok(_) => log::info!("CMD [move_materials_cost_center] Success"),
        Err(e) => log::error!("CMD [move_materials_cost_center] Failed: {}", e),
    }
    result
}

#[tauri::command]
pub fn update_materials_phase(material_ids: Vec<i64>, phase: Option<String>) -> Result<(), String> {
    log::info!("CMD [update_materials_phase] Input: ids={:?}, target_phase={:?}", material_ids, phase);
    let result = (|| -> Result<(), String> {
        let mut conn = get_connection().map_err(|e| e.to_string())?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;
        
        {
            let mut stmt = tx.prepare("UPDATE materials SET phase = ? WHERE id = ?")
                .map_err(|e| e.to_string())?;
            for id in material_ids {
                stmt.execute((&phase, id)).map_err(|e| e.to_string())?;
            }
        }
        
        tx.commit().map_err(|e| e.to_string())?;
        Ok(())
    })();
    match &result {
        Ok(_) => log::info!("CMD [update_materials_phase] Success"),
        Err(e) => log::error!("CMD [update_materials_phase] Failed: {}", e),
    }
    result
}

#[tauri::command]
pub fn update_labor_phase(labor_ids: Vec<i64>, phase: Option<String>) -> Result<(), String> {
    log::info!("CMD [update_labor_phase] Input: ids={:?}, target_phase={:?}", labor_ids, phase);
    let result = (|| -> Result<(), String> {
        let mut conn = get_connection().map_err(|e| e.to_string())?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;
        
        {
            for id in &labor_ids {
                // Find group details of this labor entry
                let mut stmt_find = tx.prepare(
                    "SELECT project_id, date, phase, description, vehicle, cost_center_id FROM labor WHERE id = ?"
                ).map_err(|e| e.to_string())?;
                
                let group_info = stmt_find.query_row([id], |row| {
                    Ok((
                        row.get::<_, i64>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, Option<String>>(2)?,
                        row.get::<_, Option<String>>(3)?,
                        row.get::<_, Option<String>>(4)?,
                        row.get::<_, Option<i64>>(5)?,
                    ))
                });
                
                if let Ok((project_id, date, old_phase, description, vehicle, cc_id)) = group_info {
                    // Update all matching rows in the group
                    let mut stmt_update = tx.prepare(
                        "UPDATE labor 
                         SET phase = ? 
                         WHERE project_id = ? 
                           AND date = ? 
                           AND phase IS ? 
                           AND description IS ? 
                           AND vehicle IS ? 
                           AND cost_center_id IS ?"
                    ).map_err(|e| e.to_string())?;
                    
                    stmt_update.execute((
                        &phase,
                        project_id,
                        date,
                        old_phase,
                        description,
                        vehicle,
                        cc_id
                    )).map_err(|e| e.to_string())?;
                }
            }
        }
        
        tx.commit().map_err(|e| e.to_string())?;
        Ok(())
    })();
    
    match &result {
        Ok(_) => log::info!("CMD [update_labor_phase] Success"),
        Err(e) => log::error!("CMD [update_labor_phase] Failed: {}", e),
    }
    result
}

#[tauri::command]
pub fn move_labor_cost_center(labor_ids: Vec<i64>, cost_center_id: Option<i64>) -> Result<(), String> {
    log::info!("CMD [move_labor_cost_center] Input: ids={:?}, target_cc={:?}", labor_ids, cost_center_id);
    let result = (|| -> Result<(), String> {
        let mut conn = get_connection().map_err(|e| e.to_string())?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;
        
        {
            for id in &labor_ids {
                // Find group details of this labor entry
                let mut stmt_find = tx.prepare(
                    "SELECT project_id, date, phase, description, vehicle, cost_center_id FROM labor WHERE id = ?"
                ).map_err(|e| e.to_string())?;
                
                let group_info = stmt_find.query_row([id], |row| {
                    Ok((
                        row.get::<_, i64>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, Option<String>>(2)?,
                        row.get::<_, Option<String>>(3)?,
                        row.get::<_, Option<String>>(4)?,
                        row.get::<_, Option<i64>>(5)?,
                    ))
                });
                
                if let Ok((project_id, date, phase, description, vehicle, old_cc)) = group_info {
                    // Update all matching rows in the group
                    let mut stmt_update = tx.prepare(
                        "UPDATE labor 
                         SET cost_center_id = ? 
                         WHERE project_id = ? 
                           AND date = ? 
                           AND phase IS ? 
                           AND description IS ? 
                           AND vehicle IS ? 
                           AND cost_center_id IS ?"
                    ).map_err(|e| e.to_string())?;
                    
                    stmt_update.execute((
                        cost_center_id,
                        project_id,
                        date,
                        phase,
                        description,
                        vehicle,
                        old_cc
                    )).map_err(|e| e.to_string())?;
                }
            }
        }
        
        tx.commit().map_err(|e| e.to_string())?;
        Ok(())
    })();
    
    match &result {
        Ok(_) => log::info!("CMD [move_labor_cost_center] Success"),
        Err(e) => log::error!("CMD [move_labor_cost_center] Failed: {}", e),
    }
    result
}


// LABOR
#[tauri::command]
pub fn get_labor(project_id: i64) -> Result<Vec<Labor>, String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("
        SELECT l.id, l.project_id, l.cost_center_id, l.phase, l.date, l.operator, l.description, l.hours, l.hourly_cost, l.markup, l.is_travel, l.vehicle, l.travel_cost, cc.model as cost_center_name 
        FROM labor l 
        LEFT JOIN cost_centers cc ON l.cost_center_id = cc.id 
        WHERE l.project_id = ? 
        ORDER BY l.date DESC, l.id DESC
    ").map_err(|e| e.to_string())?;
    
    let iter = stmt.query_map([project_id], |row| Labor::from_row(row)).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for item in iter {
        result.push(item.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
pub fn save_labor(labor: Labor) -> Result<(), String> {
    log::info!("CMD [save_labor] Input: {:?}", labor);
    let result = (|| -> Result<(), String> {
        let t_cost = labor.travel_cost.unwrap_or(0.0);
        if labor.hours < 0.0 {
            return Err("Le ore lavorative non possono essere negative".to_string());
        }
        if labor.hourly_cost < 0.0 {
            return Err("Il costo orario non può essere negativo".to_string());
        }
        if labor.markup < 0.0 {
            return Err("Il ricarico non può essere negativo".to_string());
        }
        if t_cost < 0.0 {
            return Err("Le spese di viaggio non possono essere negative".to_string());
        }

        let conn = get_connection().map_err(|e| e.to_string())?;
        
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
    })();
    match &result {
        Ok(_) => log::info!("CMD [save_labor] Success"),
        Err(e) => log::error!("CMD [save_labor] Failed: {}", e),
    }
    result
}

#[tauri::command]
pub fn delete_labor(id: i64) -> Result<(), String> {
    log::info!("CMD [delete_labor] ID: {}", id);
    let result = (|| -> Result<(), String> {
        let conn = get_connection().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM labor WHERE id=?", [id]).map_err(|e| e.to_string())?;
        Ok(())
    })();
    match &result {
        Ok(_) => log::info!("CMD [delete_labor] Success"),
        Err(e) => log::error!("CMD [delete_labor] Failed: {}", e),
    }
    result
}

// EXPENSES
#[tauri::command]
pub fn get_expenses(project_id: i64) -> Result<Vec<Expense>, String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("
        SELECT ex.id, ex.project_id, ex.cost_center_id, ex.phase, ex.date, ex.description, ex.amount, ex.markup, ex.supplier, cc.model as cost_center_name 
        FROM expenses ex 
        LEFT JOIN cost_centers cc ON ex.cost_center_id = cc.id 
        WHERE ex.project_id = ? 
        ORDER BY ex.date DESC, ex.id DESC
    ").map_err(|e| e.to_string())?;
    
    let iter = stmt.query_map([project_id], |row| Expense::from_row(row)).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for item in iter {
        result.push(item.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
pub fn save_expense(expense: Expense) -> Result<(), String> {
    log::info!("CMD [save_expense] Input: {:?}", expense);
    let result = (|| -> Result<(), String> {
        if expense.description.trim().is_empty() {
            return Err("La descrizione della spesa non può essere vuota".to_string());
        }
        if expense.amount < 0.0 {
            return Err("L'importo della spesa non può essere negativo".to_string());
        }
        if expense.markup < 0.0 {
            return Err("Il ricarico non può essere negativo".to_string());
        }

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
    })();
    match &result {
        Ok(_) => log::info!("CMD [save_expense] Success"),
        Err(e) => log::error!("CMD [save_expense] Failed: {}", e),
    }
    result
}

#[tauri::command]
pub fn delete_expense(id: i64) -> Result<(), String> {
    log::info!("CMD [delete_expense] ID: {}", id);
    let result = (|| -> Result<(), String> {
        let conn = get_connection().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM expenses WHERE id=?", [id]).map_err(|e| e.to_string())?;
        Ok(())
    })();
    match &result {
        Ok(_) => log::info!("CMD [delete_expense] Success"),
        Err(e) => log::error!("CMD [delete_expense] Failed: {}", e),
    }
    result
}

// EMPLOYEES
#[tauri::command]
pub fn get_employees() -> Result<Vec<Employee>, String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, name, default_hourly_cost FROM employees ORDER BY name ASC").map_err(|e| e.to_string())?;
    let iter = stmt.query_map([], |row| Employee::from_row(row)).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for item in iter {
        result.push(item.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
pub fn save_employee(employee: Employee) -> Result<(), String> {
    log::info!("CMD [save_employee] Input: {:?}", employee);
    let result = (|| -> Result<(), String> {
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
    })();
    match &result {
        Ok(_) => log::info!("CMD [save_employee] Success"),
        Err(e) => log::error!("CMD [save_employee] Failed: {}", e),
    }
    result
}

#[tauri::command]
pub fn delete_employee(id: i64) -> Result<(), String> {
    log::info!("CMD [delete_employee] ID: {}", id);
    let result = (|| -> Result<(), String> {
        let conn = get_connection().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM employees WHERE id=?", [id]).map_err(|e| e.to_string())?;
        Ok(())
    })();
    match &result {
        Ok(_) => log::info!("CMD [delete_employee] Success"),
        Err(e) => log::error!("CMD [delete_employee] Failed: {}", e),
    }
    result
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
    log::info!("CMD [save_global_settings] Input: {:?}", settings);
    let result = (|| -> Result<(), String> {
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
    })();
    match &result {
        Ok(_) => log::info!("CMD [save_global_settings] Success"),
        Err(e) => log::error!("CMD [save_global_settings] Failed: {}", e),
    }
    result
}

#[tauri::command]
pub fn read_app_log(app: tauri::AppHandle) -> Result<String, String> {
    use tauri::Manager;
    use std::fs;
    
    let log_dir = app.path().app_log_dir().map_err(|e| e.to_string())?;
    
    let possible_files = vec!["app.log", "current.log"];
    for filename in possible_files {
        let path = log_dir.join(filename);
        if path.exists() {
            if let Ok(content) = fs::read_to_string(&path) {
                return Ok(content);
            }
        }
    }
    
    if let Ok(entries) = fs::read_dir(&log_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("log") {
                if let Ok(content) = fs::read_to_string(&path) {
                    return Ok(content);
                }
            }
        }
    }
    
    Err("Nessun file di log trovato o leggibile".to_string())
}

#[tauri::command]
pub fn log_frontend_error(message: String, stack: String) {
    log::error!("CRASH_FRONTEND: {}\nStack Trace:\n{}", message, stack);
}

#[tauri::command]
pub fn export_database(dest_path: String) -> Result<(), String> {
    log::info!("CMD [export_database] dest_path: {}", dest_path);
    let result = (|| -> Result<(), String> {
        use crate::db::get_db_path;
        use std::fs;
        
        let db_path = get_db_path();
        if !db_path.exists() {
            return Err("Il file di database non esiste".to_string());
        }
        
        fs::copy(db_path, dest_path).map_err(|e| e.to_string())?;
        Ok(())
    })();
    match &result {
        Ok(_) => log::info!("CMD [export_database] Success"),
        Err(e) => log::error!("CMD [export_database] Failed: {}", e),
    }
    result
}

#[tauri::command]
pub fn save_pdf_file(dest_path: String, content: Vec<u8>) -> Result<(), String> {
    log::info!("CMD [save_pdf_file] dest_path: {}, size: {} bytes", dest_path, content.len());
    let result = (|| -> Result<(), String> {
        use std::fs;
        fs::write(dest_path, content).map_err(|e| e.to_string())
    })();
    match &result {
        Ok(_) => log::info!("CMD [save_pdf_file] Success"),
        Err(e) => log::error!("CMD [save_pdf_file] Failed: {}", e),
    }
    result
}

// ==========================================
// CATALOG MATERIALS (IMPORTAZIONE LISTINI)
// ==========================================

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CatalogMaterial {
    pub id: Option<i64>,
    pub code: Option<String>,
    pub description: String,
    pub unit: Option<String>,
    pub unit_price: Option<f64>,
    pub supplier: Option<String>,
    pub markup: Option<f64>,
}

impl CatalogMaterial {
    pub fn from_row(row: &rusqlite::Row) -> rusqlite::Result<Self> {
        Ok(CatalogMaterial {
            id: Some(row.get(0)?),
            code: row.get(1)?,
            description: row.get(2)?,
            unit: row.get(3)?,
            unit_price: row.get(4)?,
            supplier: row.get(5)?,
            markup: row.get(6)?,
        })
    }
}

#[tauri::command]
pub fn get_catalog_summary() -> Result<serde_json::Value, String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    
    let total_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM catalog_materials",
        [],
        |row| row.get(0)
    ).unwrap_or(0);
    
    let mut stmt = conn.prepare("
        SELECT COALESCE(NULLIF(supplier, ''), 'Senza Fornitore') as supp, COUNT(*) as count 
        FROM catalog_materials 
        GROUP BY supp 
        ORDER BY count DESC
    ").map_err(|e| e.to_string())?;
    
    let supplier_iter = stmt.query_map([], |row| {
        Ok(serde_json::json!({
            "name": row.get::<_, String>(0)?,
            "count": row.get::<_, i64>(1)?
        }))
    }).map_err(|e| e.to_string())?;
    
    let mut suppliers = Vec::new();
    for s in supplier_iter {
        suppliers.push(s.map_err(|e| e.to_string())?);
    }
    
    Ok(serde_json::json!({
        "total_count": total_count,
        "suppliers": suppliers
    }))
}

#[tauri::command]
pub fn clear_catalog_materials() -> Result<(), String> {
    log::info!("CMD [clear_catalog_materials]");
    let result = (|| -> Result<(), String> {
        let conn = get_connection().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM catalog_materials", []).map_err(|e| e.to_string())?;
        Ok(())
    })();
    match &result {
        Ok(_) => log::info!("CMD [clear_catalog_materials] Success"),
        Err(e) => log::error!("CMD [clear_catalog_materials] Failed: {}", e),
    }
    result
}

#[tauri::command]
pub fn get_catalog_materials(
    search: String,
    supplier: String,
    sort_by: String,
    sort_desc: bool,
    limit: u32,
    offset: u32,
) -> Result<serde_json::Value, String> {
    let conn = get_connection().map_err(|e| e.to_string())?;

    // Sanitizzazione ed ordinamento
    let allowed_sort_cols = ["id", "code", "description", "unit", "unit_price", "supplier", "markup"];
    let order_col = if allowed_sort_cols.contains(&sort_by.as_str()) {
        sort_by.as_str()
    } else {
        "id"
    };
    let order_dir = if sort_desc { "DESC" } else { "ASC" };

    // Costruzione query con filtri
    let search_trimmed = search.trim().to_string();
    let search_pattern = format!("%{}%", search_trimmed);
    let supplier_trimmed = supplier.trim().to_string();

    let mut where_clauses = Vec::new();
    let mut query_params: Vec<&dyn rusqlite::ToSql> = Vec::new();

    if !search_trimmed.is_empty() {
        where_clauses.push("(code LIKE ? OR description LIKE ?)".to_string());
        query_params.push(&search_pattern);
        query_params.push(&search_pattern);
    }

    if !supplier_trimmed.is_empty() && supplier_trimmed != "all" {
        if supplier_trimmed == "none" {
            where_clauses.push("(supplier IS NULL OR supplier = '')".to_string());
        } else {
            where_clauses.push("supplier = ?".to_string());
            query_params.push(&supplier_trimmed);
        }
    }

    let where_str = if where_clauses.is_empty() {
        "".to_string()
    } else {
        format!("WHERE {}", where_clauses.join(" AND "))
    };

    // 1. Calcolo del totale degli articoli corrispondenti
    let count_query = format!("SELECT COUNT(*) FROM catalog_materials {}", where_str);
    let mut count_stmt = conn.prepare(&count_query).map_err(|e| e.to_string())?;
    let total_count: i64 = count_stmt
        .query_row(rusqlite::params_from_iter(query_params.iter()), |row| row.get(0))
        .map_err(|e| e.to_string())?;

    // 2. Query per ottenere la pagina corrente
    let data_query = format!("
        SELECT id, code, description, unit, unit_price, supplier, markup
        FROM catalog_materials
        {}
        ORDER BY {} {}
        LIMIT {} OFFSET {}
    ", where_str, order_col, order_dir, limit, offset);

    let mut data_stmt = conn.prepare(&data_query).map_err(|e| e.to_string())?;
    
    let iter = data_stmt.query_map(rusqlite::params_from_iter(query_params.iter()), |row| {
        Ok(CatalogMaterial {
            id: Some(row.get(0)?),
            code: row.get(1)?,
            description: row.get(2)?,
            unit: row.get(3)?,
            unit_price: row.get(4)?,
            supplier: row.get(5)?,
            markup: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for item in iter {
        items.push(item.map_err(|e| e.to_string())?);
    }

    Ok(serde_json::json!({
        "items": items,
        "total_count": total_count
    }))
}

#[tauri::command]
pub fn save_catalog_material(item: CatalogMaterial) -> Result<(), String> {
    log::info!("CMD [save_catalog_material] Input: {:?}", item);
    let result = (|| -> Result<(), String> {
        let conn = get_connection().map_err(|e| e.to_string())?;
        if let Some(id) = item.id {
            conn.execute(
                "UPDATE catalog_materials SET code = ?, description = ?, unit = ?, unit_price = ?, supplier = ?, markup = ? WHERE id = ?",
                rusqlite::params![
                    item.code,
                    item.description,
                    item.unit,
                    item.unit_price,
                    item.supplier,
                    item.markup,
                    id
                ]
            ).map_err(|e| e.to_string())?;
        } else {
            conn.execute(
                "INSERT INTO catalog_materials (code, description, unit, unit_price, supplier, markup) VALUES (?, ?, ?, ?, ?, ?)",
                rusqlite::params![
                    item.code,
                    item.description,
                    item.unit,
                    item.unit_price,
                    item.supplier,
                    item.markup
                ]
            ).map_err(|e| e.to_string())?;
        }
        Ok(())
    })();
    match &result {
        Ok(_) => log::info!("CMD [save_catalog_material] Success"),
        Err(e) => log::error!("CMD [save_catalog_material] Failed: {}", e),
    }
    result
}

#[tauri::command]
pub fn delete_catalog_material(id: i64) -> Result<(), String> {
    log::info!("CMD [delete_catalog_material] ID: {}", id);
    let result = (|| -> Result<(), String> {
        let conn = get_connection().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM catalog_materials WHERE id = ?", [id]).map_err(|e| e.to_string())?;
        Ok(())
    })();
    match &result {
        Ok(_) => log::info!("CMD [delete_catalog_material] Success"),
        Err(e) => log::error!("CMD [delete_catalog_material] Failed: {}", e),
    }
    result
}

#[tauri::command]
pub fn search_catalog_materials(query: String) -> Result<Vec<CatalogMaterial>, String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    let search_pattern = format!("%{}%", query);
    
    // 1. Cerca prima per codice
    let mut stmt = conn.prepare("
        SELECT MIN(id) as id, code, description, unit, unit_price, supplier, markup
        FROM (
            SELECT id, code, description, unit, unit_price, supplier, markup FROM catalog_materials
            UNION
            SELECT NULL as id, code, description, unit, unit_price, supplier, markup FROM materials
        )
        WHERE code LIKE ?
        GROUP BY code, description, unit, unit_price, supplier, markup
        ORDER BY code ASC
        LIMIT 20
    ").map_err(|e| e.to_string())?;
    
    let iter = stmt.query_map([&search_pattern], |row| {
        Ok(CatalogMaterial {
            id: row.get(0)?,
            code: row.get(1)?,
            description: row.get(2)?,
            unit: row.get(3)?,
            unit_price: row.get(4)?,
            supplier: row.get(5)?,
            markup: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?;
    
    let mut results = Vec::new();
    for item in iter {
        results.push(item.map_err(|e| e.to_string())?);
    }
    
    // 2. Se non viene trovato alcun codice, passa alla ricerca per descrizione
    if results.is_empty() {
        let mut stmt_desc = conn.prepare("
            SELECT MIN(id) as id, code, description, unit, unit_price, supplier, markup
            FROM (
                SELECT id, code, description, unit, unit_price, supplier, markup FROM catalog_materials
                UNION
                SELECT NULL as id, code, description, unit, unit_price, supplier, markup FROM materials
            )
            WHERE description LIKE ?
            GROUP BY code, description, unit, unit_price, supplier, markup
            ORDER BY description ASC
            LIMIT 20
        ").map_err(|e| e.to_string())?;
        
        let iter_desc = stmt_desc.query_map([&search_pattern], |row| {
            Ok(CatalogMaterial {
                id: row.get(0)?,
                code: row.get(1)?,
                description: row.get(2)?,
                unit: row.get(3)?,
                unit_price: row.get(4)?,
                supplier: row.get(5)?,
                markup: row.get(6)?,
            })
        }).map_err(|e| e.to_string())?;
        
        for item in iter_desc {
            results.push(item.map_err(|e| e.to_string())?);
        }
    }
    
    Ok(results)
}

pub fn parse_catalog_file(file_path: &str, limit: Option<usize>) -> Result<Vec<CatalogMaterial>, String> {
    use std::path::Path;
    use std::fs::File;
    use std::io::{BufRead, BufReader};
    use calamine::{Reader, open_workbook_auto};

    let path = Path::new(file_path);
    if !path.exists() {
        return Err(format!("Il file '{}' non esiste.", file_path));
    }

    let ext = path.extension().and_then(|s| s.to_str()).unwrap_or("").to_lowercase();
    let mut imported_items = Vec::new();

    if ext == "xlsx" || ext == "xls" || ext == "xlsm" || ext == "xlsb" {
        let mut workbook = open_workbook_auto(file_path).map_err(|e| format!("Errore apertura file Excel: {}", e))?;
        
        let sheet_name = {
            let names = workbook.sheet_names();
            if names.is_empty() {
                return Err("Il file Excel non contiene fogli.".to_string());
            }
            names.iter()
                .find(|name| {
                    let n = name.to_uppercase();
                    n == "DB" || n == "LISTINO" || n == "MATERIALI" || n == "CATALOGO"
                })
                .cloned()
                .unwrap_or_else(|| names[0].clone())
        };

        if let Ok(range) = workbook.worksheet_range(&sheet_name) {
            let mut rows_iter = range.rows();
            
            // Trova la riga di intestazione (header)
            let mut header_indices = None;
            
            for (r_idx, row) in rows_iter.by_ref().enumerate() {
                let (code, desc, unit, price, supplier, markup) = map_headers(row);
                if (desc.is_some() && price.is_some()) || (code.is_some() && desc.is_some()) {
                    header_indices = Some((code, desc, unit, price, supplier, markup));
                    break;
                }
                
                if r_idx > 15 {
                    break;
                }
            }

            let (code_idx, desc_idx, unit_idx, price_idx, supplier_idx, markup_idx) = match header_indices {
                Some(indices) => indices,
                None => {
                    rows_iter = range.rows();
                    (Some(0), Some(1), Some(2), Some(3), Some(4), Some(5))
                }
            };

            for row in rows_iter {
                let description = match desc_idx {
                    Some(idx) if idx < row.len() => get_cell_as_string(&row[idx]),
                    _ => "".to_string()
                };

                if description.trim().is_empty() || description == "DESCRIZIONE" {
                    continue;
                }

                let code = match code_idx {
                    Some(idx) if idx < row.len() => {
                        let c = get_cell_as_string(&row[idx]);
                        if c.trim().is_empty() || c == "CODICE" { None } else { Some(c.trim().to_string()) }
                    },
                    _ => None
                };

                let unit = match unit_idx {
                    Some(idx) if idx < row.len() => {
                        let u = get_cell_as_string(&row[idx]);
                        if u.trim().is_empty() || u == "UM" { Some("pz".to_string()) } else { Some(u.trim().to_string()) }
                    },
                    _ => Some("pz".to_string())
                };

                let unit_price = match price_idx {
                    Some(idx) if idx < row.len() => get_cell_as_f64(&row[idx]),
                    _ => 0.0
                };

                let supplier = match supplier_idx {
                    Some(idx) if idx < row.len() => {
                        let s = get_cell_as_string(&row[idx]);
                        if s.trim().is_empty() || s == "FORNITORE" { None } else { Some(s.trim().to_string()) }
                    },
                    _ => None
                };

                let markup = match markup_idx {
                    Some(idx) if idx < row.len() => Some(get_cell_as_f64_markup(&row[idx])),
                    _ => Some(0.0)
                };

                imported_items.push(CatalogMaterial {
                    id: None,
                    code,
                    description: description.trim().to_string(),
                    unit,
                    unit_price: Some(unit_price),
                    supplier,
                    markup,
                });

                if let Some(l) = limit {
                    if imported_items.len() >= l {
                        break;
                    }
                }
            }
        }
    } else {
        let file = File::open(file_path).map_err(|e| format!("Errore apertura file CSV: {}", e))?;
        let reader = BufReader::new(file);
        let mut lines = reader.lines();

        if let Some(Ok(first_line)) = lines.next() {
            let delimiter = if first_line.contains(';') { ';' } else { ',' };
            let first_row_cells = parse_csv_line(&first_line, delimiter);
            
            let mut code_idx = None;
            let mut desc_idx = None;
            let mut unit_idx = None;
            let mut price_idx = None;
            let mut supplier_idx = None;
            let mut markup_idx = None;

            for (i, cell) in first_row_cells.iter().enumerate() {
                let s = cell.trim().to_lowercase();
                if s.contains("ricarico") || s.contains("rincaro") || s.contains("markup") || s == "ric" || s == "ric." {
                    markup_idx = Some(i);
                } else if s.contains("unitario") || s.contains("prezzo") || s.contains("price") || s.contains("costo") {
                    price_idx = Some(i);
                } else if s.contains("codice") || s == "code" || s == "art" || s == "cod" {
                    code_idx = Some(i);
                } else if s.contains("descrizione") || s.contains("description") || s == "desc" || s == "articolo" {
                    desc_idx = Some(i);
                } else if s == "um" || s.contains("unità di misura") || s.contains("unita di misura") || s == "unità" || s == "unita" || s == "unit" || s == "u.m." || s == "misura" || s == "u. m." {
                    unit_idx = Some(i);
                } else if s.contains("fornitore") || s.contains("supplier") || s == "forn" || s == "marca" {
                    supplier_idx = Some(i);
                }
            }

            let code_col = code_idx.unwrap_or(0);
            let desc_col = desc_idx.unwrap_or(1);
            let unit_col = unit_idx.unwrap_or(2);
            let price_col = price_idx.unwrap_or(3);
            let supplier_col = supplier_idx.unwrap_or(4);
            let markup_col = markup_idx.unwrap_or(5);

            for line_res in lines {
                if let Ok(line) = line_res {
                    if line.trim().is_empty() {
                        continue;
                    }
                    let cells = parse_csv_line(&line, delimiter);
                    
                    let description = if desc_col < cells.len() {
                        cells[desc_col].clone()
                    } else {
                        "".to_string()
                    };

                    if description.trim().is_empty() || description == "DESCRIZIONE" {
                        continue;
                    }

                    let code = if code_col < cells.len() {
                        let c = cells[code_col].trim().to_string();
                        if c.is_empty() || c == "CODICE" { None } else { Some(c) }
                    } else {
                        None
                    };

                    let unit = if unit_col < cells.len() {
                        let u = cells[unit_col].trim().to_string();
                        if u.is_empty() || u == "UM" { Some("pz".to_string()) } else { Some(u) }
                    } else {
                        Some("pz".to_string())
                    };

                    let unit_price = if price_col < cells.len() {
                        cells[price_col].replace(',', ".").trim().parse::<f64>().unwrap_or(0.0)
                    } else {
                        0.0
                    };

                    let supplier = if supplier_col < cells.len() {
                        let s = cells[supplier_col].trim().to_string();
                        if s.is_empty() || s == "FORNITORE" { None } else { Some(s) }
                    } else {
                        None
                    };

                    let markup = if markup_col < cells.len() {
                        Some(parse_markup_str(&cells[markup_col]))
                    } else {
                        Some(0.0)
                    };

                    imported_items.push(CatalogMaterial {
                        id: None,
                        code,
                        description: description.trim().to_string(),
                        unit,
                        unit_price: Some(unit_price),
                        supplier,
                        markup,
                    });

                    if let Some(l) = limit {
                        if imported_items.len() >= l {
                            break;
                        }
                    }
                }
            }
        }
    }

    Ok(imported_items)
}

#[tauri::command]
pub fn get_catalog_preview(file_path: String) -> Result<Vec<CatalogMaterial>, String> {
    parse_catalog_file(&file_path, Some(5))
}

#[tauri::command]
pub fn import_catalog_materials(file_path: String, clear_existing: bool) -> Result<usize, String> {
    log::info!("CMD [import_catalog_materials] file_path: {}, clear_existing: {}", file_path, clear_existing);
    let result = (|| -> Result<usize, String> {
        let imported_items = parse_catalog_file(&file_path, None)?;

        if imported_items.is_empty() {
            return Err("Nessun articolo valido trovato nel file.".to_string());
        }

        let mut conn = get_connection().map_err(|e| e.to_string())?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;

        if clear_existing {
            tx.execute("DELETE FROM catalog_materials", []).map_err(|e| e.to_string())?;
        }

        let count = imported_items.len();
        {
            let mut stmt = tx.prepare(
                "INSERT INTO catalog_materials (code, description, unit, unit_price, supplier, markup) VALUES (?, ?, ?, ?, ?, ?)"
            ).map_err(|e| e.to_string())?;

            for item in imported_items {
                stmt.execute((
                    &item.code,
                    &item.description,
                    &item.unit.unwrap_or_else(|| "pz".to_string()),
                    item.unit_price.unwrap_or(0.0),
                    &item.supplier,
                    item.markup.unwrap_or(0.0)
                )).map_err(|e| e.to_string())?;
            }
        }

        tx.commit().map_err(|e| e.to_string())?;
        Ok(count)
    })();
    match &result {
        Ok(count) => log::info!("CMD [import_catalog_materials] Success, imported {} items", count),
        Err(e) => log::error!("CMD [import_catalog_materials] Failed: {}", e),
    }
    result
}

fn map_headers(row: &[calamine::Data]) -> (Option<usize>, Option<usize>, Option<usize>, Option<usize>, Option<usize>, Option<usize>) {
    let mut code_col = None;
    let mut desc_col = None;
    let mut unit_col = None;
    let mut price_col = None;
    let mut supplier_col = None;
    let mut markup_col = None;

    for (i, cell) in row.iter().enumerate() {
        let val_str = match cell {
            calamine::Data::String(s) => s.clone(),
            calamine::Data::Float(f) => {
                if f.fract() == 0.0 {
                    format!("{}", *f as i64)
                } else {
                    f.to_string()
                }
            }
            calamine::Data::Int(i) => i.to_string(),
            _ => "".to_string(),
        };
        let s = val_str.trim().to_lowercase();
        if s.is_empty() {
            continue;
        }
        if s.contains("ricarico") || s.contains("rincaro") || s.contains("markup") || s == "ric" || s == "ric." {
            markup_col = Some(i);
        } else if s.contains("unitario") || s.contains("prezzo") || s.contains("price") || s.contains("costo") || s == "prezzo unitario" {
            price_col = Some(i);
        } else if s.contains("codice") || s == "code" || s == "art" || s == "cod" {
            code_col = Some(i);
        } else if s.contains("descrizione") || s.contains("description") || s == "desc" || s == "articolo" || s == "articolo/servizio" {
            desc_col = Some(i);
        } else if s == "um" || s.contains("unità di misura") || s.contains("unita di misura") || s == "unità" || s == "unita" || s == "unit" || s == "u.m." || s == "misura" || s == "u. m." {
            unit_col = Some(i);
        } else if s.contains("fornitore") || s.contains("supplier") || s == "forn" || s == "marca" {
            supplier_col = Some(i);
        }
    }
    (code_col, desc_col, unit_col, price_col, supplier_col, markup_col)
}

fn get_cell_as_string(cell: &calamine::Data) -> String {
    match cell {
        calamine::Data::String(s) => s.clone(),
        calamine::Data::Float(f) => {
            if f.fract() == 0.0 {
                format!("{}", *f as i64)
            } else {
                f.to_string()
            }
        }
        calamine::Data::Int(i) => i.to_string(),
        calamine::Data::Bool(b) => b.to_string(),
        _ => "".to_string(),
    }
}

fn get_cell_as_f64(cell: &calamine::Data) -> f64 {
    match cell {
        calamine::Data::Float(f) => *f,
        calamine::Data::Int(i) => *i as f64,
        calamine::Data::String(s) => {
            s.replace(',', ".").trim().parse::<f64>().unwrap_or(0.0)
        }
        _ => 0.0,
    }
}

fn clean_markup_f64(val: f64) -> f64 {
    if val > 1.0 {
        val / 100.0
    } else if val < 0.0 {
        0.0
    } else {
        val
    }
}

fn get_cell_as_f64_markup(cell: &calamine::Data) -> f64 {
    match cell {
        calamine::Data::Float(f) => clean_markup_f64(*f),
        calamine::Data::Int(i) => clean_markup_f64(*i as f64),
        calamine::Data::String(s) => {
            let clean_s = s.replace('%', "").replace(',', ".").trim().to_string();
            let parsed = clean_s.parse::<f64>().unwrap_or(0.0);
            clean_markup_f64(parsed)
        }
        _ => 0.0,
    }
}

fn parse_markup_str(s: &str) -> f64 {
    let clean_s = s.replace('%', "").replace(',', ".").trim().to_string();
    let parsed = clean_s.parse::<f64>().unwrap_or(0.0);
    clean_markup_f64(parsed)
}

fn parse_csv_line(line: &str, delimiter: char) -> Vec<String> {
    let mut values = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;
    let mut chars = line.chars().peekable();

    while let Some(c) = chars.next() {
        if c == '"' {
            in_quotes = !in_quotes;
        } else if c == delimiter && !in_quotes {
            values.push(current.trim().to_string());
            current = String::new();
        } else {
            current.push(c);
        }
    }
    values.push(current.trim().to_string());
    values
}

#[tauri::command]
pub fn search_suppliers(query: String) -> Result<Vec<String>, String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    let search_pattern = format!("%{}%", query);
    
    let mut stmt = conn.prepare("
        SELECT DISTINCT supplier 
        FROM (
            SELECT supplier FROM catalog_materials WHERE supplier IS NOT NULL AND supplier != ''
            UNION
            SELECT supplier FROM materials WHERE supplier IS NOT NULL AND supplier != ''
            UNION
            SELECT supplier FROM expenses WHERE supplier IS NOT NULL AND supplier != ''
        )
        WHERE LOWER(supplier) LIKE LOWER(?)
        ORDER BY supplier ASC
        LIMIT 10
    ").map_err(|e| e.to_string())?;
    
    let iter = stmt.query_map([&search_pattern], |row| {
        row.get::<_, String>(0)
    }).map_err(|e| e.to_string())?;
    
    let mut results = Vec::new();
    for item in iter {
        results.push(item.map_err(|e| e.to_string())?);
    }
    Ok(results)
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Quote {
    pub id: Option<i64>,
    pub client_id: i64,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct QuoteItem {
    pub id: Option<i64>,
    pub quote_id: Option<i64>,
    pub code: Option<String>,
    pub description: String,
    pub unit: Option<String>,
    pub unit_price: f64,
    pub quantity: f64,
    pub markup: f64,
}

#[tauri::command]
pub fn get_quotes() -> Result<Vec<serde_json::Value>, String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT q.id, q.client_id, q.title, q.description, q.status, q.created_at, c.name as client_name 
         FROM quotes q 
         JOIN clients c ON q.client_id = c.id 
         ORDER BY q.id DESC"
    ).map_err(|e| e.to_string())?;
    
    let iter = stmt.query_map([], |row| {
        let mut map = serde_json::Map::new();
        map.insert("id".to_string(), serde_json::Value::Number(row.get::<_, i64>(0)?.into()));
        map.insert("client_id".to_string(), serde_json::Value::Number(row.get::<_, i64>(1)?.into()));
        map.insert("title".to_string(), serde_json::Value::String(row.get(2)?));
        map.insert("description".to_string(), row.get::<_, Option<String>>(3)?.map_or(serde_json::Value::Null, serde_json::Value::String));
        map.insert("status".to_string(), serde_json::Value::String(row.get(4)?));
        map.insert("created_at".to_string(), serde_json::Value::String(row.get(5)?));
        map.insert("client_name".to_string(), serde_json::Value::String(row.get(6)?));
        Ok(serde_json::Value::Object(map))
    }).map_err(|e| e.to_string())?;
    
    let mut quotes = Vec::new();
    for q in iter {
        quotes.push(q.map_err(|e| e.to_string())?);
    }
    Ok(quotes)
}

#[tauri::command]
pub fn save_quote(quote: Quote, items: Vec<QuoteItem>) -> Result<i64, String> {
    log::info!("CMD [save_quote] Quote: {:?}, Items count: {}", quote, items.len());
    let mut conn = get_connection().map_err(|e| e.to_string())?;
    
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    
    let quote_id = if let Some(id) = quote.id {
        tx.execute(
            "UPDATE quotes SET client_id=?, title=?, description=?, status=? WHERE id=?",
            (quote.client_id, quote.title, quote.description, quote.status, id),
        ).map_err(|e| e.to_string())?;
        
        // Delete existing items to recreate
        tx.execute("DELETE FROM quote_items WHERE quote_id=?", [id]).map_err(|e| e.to_string())?;
        id
    } else {
        tx.execute(
            "INSERT INTO quotes (client_id, title, description, status, created_at) VALUES (?, ?, ?, ?, ?)",
            (quote.client_id, quote.title, quote.description, quote.status, quote.created_at),
        ).map_err(|e| e.to_string())?;
        tx.last_insert_rowid()
    };
    
    for item in items {
        tx.execute(
            "INSERT INTO quote_items (quote_id, code, description, unit, unit_price, quantity, markup) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (quote_id, item.code, item.description, item.unit.unwrap_or_else(|| "pz".to_string()), item.unit_price, item.quantity, item.markup),
        ).map_err(|e| e.to_string())?;
    }
    
    tx.commit().map_err(|e| e.to_string())?;
    Ok(quote_id)
}

#[tauri::command]
pub fn get_quote_details(quote_id: i64) -> Result<serde_json::Value, String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    
    // Get quote
    let mut stmt_q = conn.prepare(
        "SELECT q.id, q.client_id, q.title, q.description, q.status, q.created_at, c.name as client_name 
         FROM quotes q 
         JOIN clients c ON q.client_id = c.id 
         WHERE q.id = ?"
    ).map_err(|e| e.to_string())?;
    
    let quote_opt = stmt_q.query_row([quote_id], |row| {
        let mut map = serde_json::Map::new();
        map.insert("id".to_string(), serde_json::Value::Number(row.get::<_, i64>(0)?.into()));
        map.insert("client_id".to_string(), serde_json::Value::Number(row.get::<_, i64>(1)?.into()));
        map.insert("title".to_string(), serde_json::Value::String(row.get(2)?));
        map.insert("description".to_string(), row.get::<_, Option<String>>(3)?.map_or(serde_json::Value::Null, serde_json::Value::String));
        map.insert("status".to_string(), serde_json::Value::String(row.get(4)?));
        map.insert("created_at".to_string(), serde_json::Value::String(row.get(5)?));
        map.insert("client_name".to_string(), serde_json::Value::String(row.get(6)?));
        Ok(serde_json::Value::Object(map))
    }).map_err(|e| e.to_string()).ok();
    
    let quote_val = match quote_opt {
        Some(q) => q,
        None => return Err("Quote not found".to_string()),
    };
    
    // Get items
    let mut stmt_i = conn.prepare(
        "SELECT id, code, description, unit, unit_price, quantity, markup FROM quote_items WHERE quote_id = ? ORDER BY id ASC"
    ).map_err(|e| e.to_string())?;
    
    let items_iter = stmt_i.query_map([quote_id], |row| {
        let mut map = serde_json::Map::new();
        map.insert("id".to_string(), serde_json::Value::Number(row.get::<_, i64>(0)?.into()));
        map.insert("code".to_string(), row.get::<_, Option<String>>(1)?.map_or(serde_json::Value::Null, serde_json::Value::String));
        map.insert("description".to_string(), serde_json::Value::String(row.get(2)?));
        map.insert("unit".to_string(), serde_json::Value::String(row.get(3)?));
        map.insert("unit_price".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(row.get(4)?).unwrap()));
        map.insert("quantity".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(row.get(5)?).unwrap()));
        map.insert("markup".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(row.get(6)?).unwrap()));
        Ok(serde_json::Value::Object(map))
    }).map_err(|e| e.to_string())?;
    
    let mut items = Vec::new();
    for item in items_iter {
        items.push(item.map_err(|e| e.to_string())?);
    }
    
    let mut result = serde_json::Map::new();
    result.insert("quote".to_string(), quote_val);
    result.insert("items".to_string(), serde_json::Value::Array(items));
    
    Ok(serde_json::Value::Object(result))
}

#[tauri::command]
pub fn delete_quote(id: i64) -> Result<(), String> {
    log::info!("CMD [delete_quote] ID: {}", id);
    let conn = get_connection().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM quotes WHERE id=?", [id]).map_err(|e| e.to_string())?;
    Ok(())
}

// ==========================================
// CUSTOM REGEX-LESS XML PARSER FOR INVOICES
// ==========================================

fn extract_tag(content: &str, tag_name: &str) -> Option<String> {
    let mut start = 0;
    while let Some(pos) = content[start..].find('<') {
        let absolute_pos = start + pos;
        if let Some(tag_end_offset) = content[absolute_pos..].find('>') {
            let tag_end = absolute_pos + tag_end_offset;
            let full_start_tag = &content[absolute_pos + 1..tag_end];
            let tag_name_part = full_start_tag.split(' ').next()?;
            let actual_name = tag_name_part.split(':').last()?;
            
            if actual_name == tag_name {
                let content_start = tag_end + 1;
                let mut end_pos_search = content_start;
                while let Some(end_offset) = content[end_pos_search..].find("</") {
                    let end_pos = end_pos_search + end_offset;
                    if let Some(end_tag_close_offset) = content[end_pos..].find('>') {
                        let end_tag_close = end_pos + end_tag_close_offset;
                        let end_tag_part = content[end_pos + 2..end_tag_close].split(' ').next()?.split(':').last()?;
                        if end_tag_part == tag_name {
                            return Some(content[content_start..end_pos].trim().to_string());
                        }
                        end_pos_search = end_pos + 2;
                    } else {
                        break;
                    }
                }
                return None;
            }
            start = absolute_pos + 1;
        } else {
            break;
        }
    }
    None
}

fn extract_all_blocks(content: &str, tag_name: &str) -> Vec<String> {
    let mut blocks = Vec::new();
    let mut start = 0;
    while let Some(pos) = content[start..].find('<') {
        let absolute_pos = start + pos;
        if let Some(tag_end_offset) = content[absolute_pos..].find('>') {
            let tag_end = absolute_pos + tag_end_offset;
            let full_start_tag = &content[absolute_pos + 1..tag_end];
            let tag_name_part = match full_start_tag.split(' ').next() {
                Some(p) => p,
                None => { start = absolute_pos + 1; continue; }
            };
            let actual_name = match tag_name_part.split(':').last() {
                Some(n) => n,
                None => { start = absolute_pos + 1; continue; }
            };
            
            if actual_name == tag_name {
                let content_start = tag_end + 1;
                let mut end_pos_search = content_start;
                let mut found = false;
                while let Some(end_offset) = content[end_pos_search..].find("</") {
                    let end_pos = end_pos_search + end_offset;
                    if let Some(end_tag_close_offset) = content[end_pos..].find('>') {
                        let end_tag_close = end_pos + end_tag_close_offset;
                        let end_tag_part = match content[end_pos + 2..end_tag_close].split(' ').next() {
                            Some(p) => match p.split(':').last() {
                                Some(n) => n,
                                None => ""
                            },
                            None => ""
                        };
                        if end_tag_part == tag_name {
                            blocks.push(content[content_start..end_pos].trim().to_string());
                            start = end_tag_close + 1;
                            found = true;
                            break;
                        }
                        end_pos_search = end_pos + 2;
                    } else {
                        break;
                    }
                }
                if !found {
                    start = absolute_pos + 1;
                }
            } else {
                start = absolute_pos + 1;
            }
        } else {
            break;
        }
    }
    blocks
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct XmlInvoiceItem {
    pub line_number: String,
    pub code_alternativo: Option<String>,
    pub code_produttore: Option<String>,
    pub description: String,
    pub quantity: f64,
    pub unit: String,
    pub unit_price: f64,
    pub total_price: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct XmlMappingRow {
    pub id: usize,
    pub invoice_item: XmlInvoiceItem,
    pub suggested_item: Option<CatalogMaterial>,
    pub match_score: i32,
    pub action: String, // "update", "create", "ignore"
    pub selected_catalog_item_id: Option<i64>,
    pub custom_code: String,
    pub markup: Option<f64>,
}

#[tauri::command]
pub fn parse_invoice_xml(file_path: String) -> Result<Vec<XmlMappingRow>, String> {
    log::info!("CMD [parse_invoice_xml] file_path: {}", file_path);
    let xml_content = std::fs::read_to_string(&file_path).map_err(|e| e.to_string())?;
    let conn = get_connection().map_err(|e| e.to_string())?;
    
    // Estrazione del fornitore (CedentePrestatore)
    let cedente_blocks = extract_all_blocks(&xml_content, "CedentePrestatore");
    let _supplier_name = if !cedente_blocks.is_empty() {
        extract_tag(&cedente_blocks[0], "Denominazione").unwrap_or_else(|| "Fornitore Generico".to_string())
    } else {
        "Fornitore Generico".to_string()
    };
    
    let dettaglio_linee = extract_all_blocks(&xml_content, "DettaglioLinee");
    let mut mappings = Vec::new();
    
    for (idx, block) in dettaglio_linee.iter().enumerate() {
        let line_num = extract_tag(block, "NumeroLinea").unwrap_or_else(|| (idx + 1).to_string());
        let description = extract_tag(block, "Descrizione").unwrap_or_default();
        
        let quantity_str = extract_tag(block, "Quantita").unwrap_or_default();
        let quantity: f64 = quantity_str.parse().unwrap_or(0.0);
        
        let unit = extract_tag(block, "UnitaMisura").unwrap_or_default();
        
        let unit_price_str = extract_tag(block, "PrezzoUnitario").unwrap_or_default();
        let unit_price: f64 = unit_price_str.parse().unwrap_or(0.0);
        
        let total_price_str = extract_tag(block, "PrezzoTotale").unwrap_or_default();
        let total_price: f64 = total_price_str.parse().unwrap_or(0.0);
        
        // Estrarre codici articolo
        let cod_blocks = extract_all_blocks(block, "CodiceArticolo");
        let mut code_alternativo = None;
        let mut code_produttore = None;
        
        for cb in cod_blocks {
            let ct = extract_tag(&cb, "CodiceTipo").unwrap_or_default();
            let cv = extract_tag(&cb, "CodiceValore").unwrap_or_default();
            if ct == "CODICE ALTERNATIVO" {
                code_alternativo = Some(cv);
            } else if ct == "CODICE PRODUTTORE" {
                code_produttore = Some(cv);
            }
        }
        
        let invoice_item = XmlInvoiceItem {
            line_number: line_num,
            code_alternativo: code_alternativo.clone(),
            code_produttore: code_produttore.clone(),
            description: description.clone(),
            quantity,
            unit: unit.clone(),
            unit_price,
            total_price,
        };
        
        // Riconciliazione (matching) nel database listino (catalog_materials)
        let mut suggested_item: Option<CatalogMaterial> = None;
        let mut match_score = 0;
        let mut action = "create".to_string();
        
        let mut search_codes = Vec::new();
        if let Some(ref alt) = code_alternativo {
            search_codes.push(alt.clone());
        }
        if let Some(ref prod) = code_produttore {
            search_codes.push(prod.clone());
        }
        
        if !search_codes.is_empty() {
            // Cerchiamo nel DB listino catalog_materials
            let query_placeholders = search_codes.iter().map(|_| "?").collect::<Vec<_>>().join(",");
            let sql = format!(
                "SELECT id, code, description, unit, unit_price, supplier, markup FROM catalog_materials WHERE code IN ({}) LIMIT 1",
                query_placeholders
            );
            
            let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
            let params = rusqlite::params_from_iter(search_codes.iter());
            let mut rows = stmt.query(params).map_err(|e| e.to_string())?;
            
            if let Some(row) = rows.next().map_err(|e| e.to_string())? {
                let found_item = CatalogMaterial::from_row(row).map_err(|e| e.to_string())?;
                suggested_item = Some(found_item);
                match_score = 100;
                action = "update".to_string();
            }
        }
        
        // Se non abbiamo trovato corrispondenza esatta per codice, proviamo per descrizione esatta
        if suggested_item.is_none() {
            let mut stmt = conn.prepare(
                "SELECT id, code, description, unit, unit_price, supplier, markup FROM catalog_materials WHERE LOWER(description) = LOWER(?) LIMIT 1"
            ).map_err(|e| e.to_string())?;
            
            let mut rows = stmt.query([&description]).map_err(|e| e.to_string())?;
            if let Some(row) = rows.next().map_err(|e| e.to_string())? {
                let found_item = CatalogMaterial::from_row(row).map_err(|e| e.to_string())?;
                suggested_item = Some(found_item);
                match_score = 90;
                action = "update".to_string();
            }
        }
        
        // Se non troviamo nulla, proponiamo la creazione
        let custom_code = if suggested_item.is_none() {
            code_produttore.clone().or_else(|| code_alternativo.clone()).unwrap_or_default()
        } else {
            "".to_string()
        };
        
        let selected_catalog_item_id = suggested_item.as_ref().and_then(|item| item.id);
        let markup = suggested_item.as_ref().and_then(|item| item.markup).or(Some(0.0));
        
        mappings.push(XmlMappingRow {
            id: idx,
            invoice_item,
            suggested_item,
            match_score,
            action,
            selected_catalog_item_id,
            custom_code,
            markup,
        });
    }
    
    Ok(mappings)
}

#[tauri::command]
pub fn import_invoice_mappings(mappings: Vec<XmlMappingRow>, supplier: String) -> Result<(), String> {
    log::info!("CMD [import_invoice_mappings] count: {}, supplier: {}", mappings.len(), supplier);
    let mut conn = get_connection().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    
    for row in mappings {
        let markup_val = row.markup.unwrap_or(0.0);
        match row.action.as_str() {
            "update" => {
                if let Some(catalog_id) = row.selected_catalog_item_id {
                    let price = row.invoice_item.unit_price;
                    tx.execute(
                        "UPDATE catalog_materials SET unit_price = ?, markup = ? WHERE id = ?",
                        rusqlite::params![price, markup_val, catalog_id],
                    ).map_err(|e| e.to_string())?;
                }
            }
            "create" => {
                let code = if !row.custom_code.trim().is_empty() {
                    row.custom_code.trim().to_string()
                } else {
                    row.invoice_item.code_produttore.clone()
                        .or_else(|| row.invoice_item.code_alternativo.clone())
                        .unwrap_or_else(|| format!("NEW-{}", row.id))
                };
                
                let desc = row.invoice_item.description;
                let unit = row.invoice_item.unit;
                let price = row.invoice_item.unit_price;
                
                tx.execute(
                    "INSERT INTO catalog_materials (code, description, unit, unit_price, supplier, markup) VALUES (?, ?, ?, ?, ?, ?)",
                    rusqlite::params![code, desc, unit, price, supplier, markup_val],
                ).map_err(|e| e.to_string())?;
            }
            _ => {} // ignore
        }
    }
    
    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

