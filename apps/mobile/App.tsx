import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { getStudentDashboard, login } from "./src/lib/api";

type Dashboard = {
  student: {
    fullName: string;
    photoUrl?: string;
  };
  plan?: {
    name: string;
    modality: string;
  } | null;
  nextInvoice?: {
    dueDate: string;
    status: string;
  } | null;
  financialStatus: string;
};

export default function App() {
  const [email, setEmail] = useState("aluno@academia.test");
  const [password, setPassword] = useState("123456");
  const [token, setToken] = useState("");
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");

  async function handleLogin() {
    setError("");
    try {
      const payload = await login(email, password);
      setToken(payload.token);
      const data = await getStudentDashboard(payload.token);
      setDashboard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    }
  }

  if (!token || !dashboard) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.loginBox}>
          <Text style={styles.title}>Area do aluno</Text>
          <Text style={styles.subtitle}>Acesse seu plano, vencimento e situacao financeira.</Text>
          <TextInput style={styles.input} autoCapitalize="none" value={email} onChangeText={setEmail} placeholder="E-mail" />
          <TextInput style={styles.input} secureTextEntry value={password} onChangeText={setPassword} placeholder="Senha" />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity style={styles.button} onPress={handleLogin}>
            <Text style={styles.buttonText}>Entrar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          {dashboard.student.photoUrl ? <Image source={{ uri: dashboard.student.photoUrl }} style={styles.avatar} /> : null}
          <View>
            <Text style={styles.title}>{dashboard.student.fullName}</Text>
            <Text style={styles.subtitle}>{dashboard.plan?.name ?? "Sem plano ativo"}</Text>
          </View>
        </View>

        <View style={styles.grid}>
          <InfoCard label="Modalidade" value={dashboard.plan?.modality ?? "-"} />
          <InfoCard label="Proximo vencimento" value={dashboard.nextInvoice ? new Date(dashboard.nextInvoice.dueDate).toLocaleDateString("pt-BR") : "-"} />
          <InfoCard label="Situacao financeira" value={dashboard.financialStatus} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f7f4"
  },
  content: {
    padding: 20,
    gap: 16
  },
  loginBox: {
    margin: 20,
    marginTop: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
    padding: 20,
    gap: 12
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#e5e7eb"
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#141414"
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: "#6b7280"
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff"
  },
  button: {
    borderRadius: 6,
    backgroundColor: "#0f766e",
    padding: 12,
    alignItems: "center"
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700"
  },
  error: {
    color: "#b91c1c",
    fontSize: 13
  },
  grid: {
    gap: 12
  },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
    padding: 16
  },
  cardLabel: {
    color: "#6b7280",
    fontSize: 13
  },
  cardValue: {
    marginTop: 6,
    color: "#141414",
    fontSize: 18,
    fontWeight: "700"
  }
});
